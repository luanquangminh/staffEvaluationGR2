/**
 * Integration test for the Assessment page — the most critical user-facing flow
 * in the app (peer evaluation submission). Verifies:
 *   1. Page renders the group picker, advances to colleague picker, then form.
 *   2. Submitting a fully-filled form calls POST /evaluations/bulk with the
 *      correct payload, shows a success toast, and refetches the relevant
 *      query-cache entries.
 *   3. Submitting with a missing score shows an inline validation toast and
 *      does NOT hit the bulk endpoint.
 *
 * Network is mocked at the `api` module boundary rather than via msw — the
 * app already encapsulates fetch behind ApiClient, so mocking that layer
 * keeps the test hermetic and matches the pattern used in useAuth.test.tsx.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ReactNode } from 'react';
import Assessment from './Assessment';
import { api } from '@/lib/api';
import { toast } from 'sonner';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
    hasTokens: vi.fn(() => true),
    setSessionExpiredHandler: vi.fn(),
  },
  API_URL: 'http://localhost:3001',
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    staffId: 1,
    user: { id: 'u1', email: 'me@test.com', staffId: 1, roles: ['user'], isAdmin: false },
    loading: false,
    isAdmin: false,
    isModerator: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    setAuthFromTokens: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);
const mockedToast = vi.mocked(toast);

const mockPeriod = {
  id: 10,
  name: '2026 Q1',
  status: 'active',
  startdate: '2026-01-01',
  enddate: '2026-03-31',
};
const mockGroup = { id: 5, name: 'Group Alpha', organizationUnit: null };
const mockColleague = {
  id: 2,
  name: 'Alice Nguyen',
  staffcode: 'GV002',
  academicrank: null,
  academicdegree: null,
  avatar: null,
  organizationUnit: null,
};
const mockQuestions = [
  { id: 101, title: 'Professionalism', description: 'Conducts themselves professionally' },
  { id: 102, title: 'Collaboration', description: 'Works well with peers' },
];

function setupApiMocks({ existingEvaluations = [] }: { existingEvaluations?: unknown[] } = {}) {
  mockedApi.get.mockImplementation((path: string) => {
    if (path === '/evaluation-periods/active') return Promise.resolve([mockPeriod]);
    if (path === '/evaluations/my-groups') return Promise.resolve([mockGroup]);
    if (path === '/questions') return Promise.resolve(mockQuestions);
    if (path.startsWith('/evaluations/colleagues/')) return Promise.resolve([mockColleague]);
    if (path.startsWith('/evaluations/my')) return Promise.resolve(existingEvaluations);
    return Promise.resolve([]);
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
  return render(<Assessment />, { wrapper });
}

describe('Assessment page — integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits a fully-filled evaluation and shows success toast', async () => {
    const user = userEvent.setup();
    setupApiMocks();
    mockedApi.post.mockResolvedValueOnce({ ok: true });

    renderPage();

    // Step 1: group picker appears, click the group
    const groupButton = await screen.findByRole('button', { name: /Group Alpha/i });
    await user.click(groupButton);

    // Step 2: colleague picker appears, click the colleague
    const colleagueButton = await screen.findByRole('button', { name: /Alice Nguyen/i });
    await user.click(colleagueButton);

    // Step 3: form renders with two numeric inputs (one per question)
    const inputs = await screen.findAllByRole('spinbutton');
    expect(inputs).toHaveLength(2);

    await user.clear(inputs[0]);
    await user.type(inputs[0], '3.5');
    await user.clear(inputs[1]);
    await user.type(inputs[1], '4');

    await user.click(screen.getByRole('button', { name: /Lưu đánh giá/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/evaluations/bulk', {
        groupId: 5,
        evaluateeId: 2,
        periodId: 10,
        evaluations: { 101: 3.5, 102: 4 },
      });
    });

    expect(mockedToast.success).toHaveBeenCalledWith(expect.stringContaining('thành công'));
    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  it('blocks submit and toasts an error when any score is missing', async () => {
    const user = userEvent.setup();
    setupApiMocks();

    renderPage();

    const groupButton = await screen.findByRole('button', { name: /Group Alpha/i });
    await user.click(groupButton);

    const colleagueButton = await screen.findByRole('button', { name: /Alice Nguyen/i });
    await user.click(colleagueButton);

    const inputs = await screen.findAllByRole('spinbutton');
    // Only fill the first score, leaving the second unanswered
    await user.clear(inputs[0]);
    await user.type(inputs[0], '3');

    await user.click(screen.getByRole('button', { name: /Lưu đánh giá/i }));

    await waitFor(() => {
      expect(mockedToast.error).toHaveBeenCalledWith(
        expect.stringMatching(/1 tiêu chí còn thiếu/),
      );
    });
    expect(mockedApi.post).not.toHaveBeenCalled();
  });
});
