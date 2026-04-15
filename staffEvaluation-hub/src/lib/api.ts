const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const REQUEST_TIMEOUT_MS = 30_000;

type SessionExpiredHandler = () => void;

// FE-5: Preserves the full shape of a backend error so callers can decide
// whether to show a toast, highlight a specific field, or both. The
// `fields` map is populated by NestJS ValidationPipe's exceptionFactory
// (see main.ts) — values are arrays of constraint messages per field path.
export class ApiError extends Error {
  readonly statusCode: number;
  readonly fields: Record<string, string[]>;

  constructor(message: string, statusCode: number, fields: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.fields = fields;
  }

  hasFieldErrors(): boolean {
    return Object.keys(this.fields).length > 0;
  }

  firstFieldError(field: string): string | undefined {
    return this.fields[field]?.[0];
  }
}

class ApiClient {
  private refreshPromise: Promise<boolean> | null = null;
  private onSessionExpired: SessionExpiredHandler | null = null;

  private fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  hasTokens(): boolean {
    return !!this.getAccessToken();
  }

  setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
    this.onSessionExpired = handler;
  }

  private async refreshAccessToken(): Promise<boolean> {
    // If a refresh is already in-flight, reuse it
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) return false;

      try {
        const res = await this.fetchWithTimeout(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) return false;

        const data = await res.json();
        this.setTokens(data.accessToken, data.refreshToken);
        return true;
      } catch {
        return false;
      }
    })();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const accessToken = this.getAccessToken();
    const hasBody = options.body !== undefined;
    const isFormData = hasBody && options.body instanceof FormData;

    const headers: Record<string, string> = {
      ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers as Record<string, string>),
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let res = await this.fetchWithTimeout(`${API_URL}${path}`, { ...options, headers });

    // Auto-refresh on 401
    if (res.status === 401 && accessToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getAccessToken()}`;
        res = await this.fetchWithTimeout(`${API_URL}${path}`, { ...options, headers });
      } else {
        this.clearTokens();
        this.onSessionExpired?.();
        throw new Error('Session expired');
      }
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const rawMessage = body.message;
      // NestJS default ValidationPipe returns message as string[]; our
      // custom exceptionFactory returns a plain string. Handle both.
      const message = Array.isArray(rawMessage)
        ? rawMessage[0] ?? `Request failed: ${res.status}`
        : rawMessage || `Request failed: ${res.status}`;
      const fields = (body.fields && typeof body.fields === 'object') ? body.fields : {};
      throw new ApiError(message, res.status, fields);
    }

    // Handle 204 No Content
    if (res.status === 204) return undefined as T;

    return res.json();
  }

  get<T>(path: string): Promise<T> {
    return this.fetch<T>(path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.fetch<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.fetch<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.fetch<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete<T>(path: string): Promise<T> {
    return this.fetch<T>(path, { method: 'DELETE' });
  }

  uploadFile<T>(path: string, file: File, fieldName = 'file'): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);
    return this.fetch<T>(path, { method: 'POST', body: formData });
  }
}

export const api = new ApiClient();
export { API_URL };
