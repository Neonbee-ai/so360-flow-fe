import { describe, it, expect, vi, beforeEach } from 'vitest';

let interceptorCallback: (config: any) => any;

vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn((cb: any) => {
          interceptorCallback = cb;
        }),
      },
    },
  };
  return { default: { create: vi.fn(() => mockAxiosInstance) } };
});

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
});

describe('flowApi interceptor', () => {
  describe('Given localStorage has tenant and auth data', () => {
    it('When a request is made / Then headers are injected from localStorage', async () => {
      localStorage.setItem('currentTenantId', 't1');
      localStorage.setItem('currentOrgId', 'o1');
      localStorage.setItem('userId', 'u1');
      localStorage.setItem('flowAuthToken', 'tok123');

      await import('../services/flowApi');

      const config = { headers: {} as Record<string, string> };
      const result = interceptorCallback(config);

      expect(result.headers['X-Tenant-Id']).toBe('t1');
      expect(result.headers['X-Org-Id']).toBe('o1');
      expect(result.headers['X-User-Id']).toBe('u1');
      expect(result.headers['Authorization']).toBe('Bearer tok123');
    });
  });

  describe('Given localStorage is empty', () => {
    it('When a request is made / Then no headers are injected', async () => {
      await import('../services/flowApi');

      const config = { headers: {} as Record<string, string> };
      const result = interceptorCallback(config);

      expect(result.headers['X-Tenant-Id']).toBeUndefined();
      expect(result.headers['X-Org-Id']).toBeUndefined();
      expect(result.headers['X-User-Id']).toBeUndefined();
      expect(result.headers['Authorization']).toBeUndefined();
    });
  });
});
