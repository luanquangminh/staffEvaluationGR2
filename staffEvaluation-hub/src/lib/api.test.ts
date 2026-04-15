import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from './api';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(store).forEach(k => delete store[k]);
  });

  afterEach(() => {
    api.clearTokens();
  });

  describe('GET requests', () => {
    it('should fetch data without auth header when no token', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));

      const result = await api.get('/test');

      expect(result).toEqual({ id: 1 });
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/test');
      expect(options.headers?.Authorization).toBeUndefined();
    });

    it('should include Bearer token when authenticated', async () => {
      api.setTokens('access-123', 'refresh-456');
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

      await api.get('/protected');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBe('Bearer access-123');
    });
  });

  describe('POST requests', () => {
    it('should send JSON body with Content-Type header', async () => {
      api.setTokens('access-123', 'refresh-456');
      mockFetch.mockResolvedValueOnce(jsonResponse({ created: true }, 201));

      const result = await api.post('/items', { name: 'test' });

      expect(result).toEqual({ created: true });
      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(options.body)).toEqual({ name: 'test' });
    });
  });

  describe('error handling', () => {
    it('should throw on non-OK response with message from body', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 }),
      );

      await expect(api.get('/missing')).rejects.toThrow('Not Found');
    });

    it('should throw generic message when body has no message', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('{}', { status: 500 }),
      );

      await expect(api.get('/error')).rejects.toThrow('Request failed: 500');
    });
  });

  describe('token refresh', () => {
    it('should auto-refresh on 401 and retry the request', async () => {
      api.setTokens('expired-token', 'valid-refresh');

      // First call returns 401
      mockFetch.mockResolvedValueOnce(
        new Response('{}', { status: 401 }),
      );
      // Refresh call succeeds
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
      );
      // Retry succeeds
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: 'success' }));

      const result = await api.get('/protected');

      expect(result).toEqual({ data: 'success' });
      expect(mockFetch).toHaveBeenCalledTimes(3);
      // Verify new tokens were saved
      expect(store.accessToken).toBe('new-access');
      expect(store.refreshToken).toBe('new-refresh');
    });

    it('should clear tokens and throw when refresh fails', async () => {
      api.setTokens('expired-token', 'invalid-refresh');

      // First call returns 401
      mockFetch.mockResolvedValueOnce(
        new Response('{}', { status: 401 }),
      );
      // Refresh call fails
      mockFetch.mockResolvedValueOnce(
        new Response('{}', { status: 401 }),
      );

      await expect(api.get('/protected')).rejects.toThrow('Session expired');
      expect(store.accessToken).toBeUndefined();
      expect(store.refreshToken).toBeUndefined();
    });

    // FE-2 — explicit assertion that the retry uses the new access token
    // after refresh succeeds (above test only checks return value + store).
    it('should retry the original request with the newly issued access token', async () => {
      api.setTokens('expired-token', 'valid-refresh');

      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 401 }));
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ accessToken: 'fresh-access', refreshToken: 'fresh-refresh' }),
      );
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

      await api.get('/protected');

      // 3 calls: original 401, /auth/refresh, retried GET.
      expect(mockFetch).toHaveBeenCalledTimes(3);
      const [retryUrl, retryOptions] = mockFetch.mock.calls[2];
      expect(retryUrl).toContain('/protected');
      // ApiClient mutates the headers object in place when retrying, so the
      // final state we assert against is the retry — which must carry the
      // freshly-issued access token.
      expect(retryOptions.headers.Authorization).toBe('Bearer fresh-access');
      // /auth/refresh must have been called with the stored refresh token.
      const [refreshUrl, refreshOptions] = mockFetch.mock.calls[1];
      expect(refreshUrl).toContain('/auth/refresh');
      expect(JSON.parse(refreshOptions.body)).toEqual({ refreshToken: 'valid-refresh' });
    });

    it('should coalesce concurrent refresh requests', async () => {
      api.setTokens('expired-token', 'valid-refresh');

      // Both calls return 401
      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 401 }));
      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 401 }));
      // Single refresh call
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
      );
      // Both retries succeed
      mockFetch.mockResolvedValueOnce(jsonResponse({ a: 1 }));
      mockFetch.mockResolvedValueOnce(jsonResponse({ b: 2 }));

      const [r1, r2] = await Promise.all([
        api.get('/endpoint-a'),
        api.get('/endpoint-b'),
      ]);

      expect(r1).toEqual({ a: 1 });
      expect(r2).toEqual({ b: 2 });
      // Only 1 refresh call should have been made (calls: 2 initial + 1 refresh + 2 retries = 5)
      const refreshCalls = mockFetch.mock.calls.filter(
        ([url]) => url.includes('/auth/refresh'),
      );
      expect(refreshCalls.length).toBe(1);
    });
  });

  describe('204 No Content', () => {
    it('should return undefined for 204 responses', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(null, { status: 204 }),
      );

      const result = await api.delete('/items/1');

      expect(result).toBeUndefined();
    });
  });

  describe('token management', () => {
    it('should store and retrieve tokens', () => {
      api.setTokens('a', 'b');
      expect(api.hasTokens()).toBe(true);
    });

    it('should clear tokens', () => {
      api.setTokens('a', 'b');
      api.clearTokens();
      expect(api.hasTokens()).toBe(false);
    });
  });
});
