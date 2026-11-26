import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Counts how many times each page module is evaluated: a lazy page's module only
// evaluates when its chunk is imported, so a count > 0 before any render proves the
// App preloaded it at module eval (deep link → no extra round trip after Shell sync).
const evaluated = vi.hoisted(() => ({ dashboard: 0, pending: 0, builder: 0 }));

vi.mock('@so360/shell-context', () => ({ useShellBridge: () => null }));
vi.mock('../utils/initializeMfe', () => ({ MfeShellInitializer: ({ children }: any) => children }));

// doMock re-runs each factory on every fresh import, so counts are per test (a plain vi.mock factory is cached).
const mockPages = () => {
  vi.doMock('../pages/FlowDashboard', () => { evaluated.dashboard++; return { FlowDashboard: () => null }; });
  vi.doMock('../pages/PendingApprovals', () => { evaluated.pending++; return { PendingApprovals: () => null }; });
  vi.doMock('../pages/FlowBuilder', () => { evaluated.builder++; return { FlowBuilder: () => null }; });
};

const loadAppAt = async (path: string) => {
  window.history.pushState({}, '', path);
  mockPages();
  vi.resetModules();
  await import('../App');
  // Let the preloaded dynamic import settle.
  await new Promise((r) => setTimeout(r, 0));
};

describe('App route chunk preloading', () => {
  beforeEach(() => {
    evaluated.dashboard = 0;
    evaluated.pending = 0;
    evaluated.builder = 0;
  });
  afterEach(() => window.history.pushState({}, '', '/'));

  describe('Given a deep link to the module landing route', () => {
    it('When the MFE module evaluates Then only the dashboard chunk is requested', async () => {
      await loadAppAt('/flow');
      expect(evaluated.dashboard).toBe(1);
      expect(evaluated.pending).toBe(0);
      expect(evaluated.builder).toBe(0);
    });
  });

  describe('Given a deep link to the pending approvals page', () => {
    it('When the MFE module evaluates Then only the pending approvals chunk is requested', async () => {
      await loadAppAt('/flow/approvals/pending');
      expect(evaluated.pending).toBe(1);
      expect(evaluated.dashboard).toBe(0);
    });
  });

  describe('Given a deep link to a flow builder', () => {
    it('When the MFE module evaluates Then the builder chunk is requested', async () => {
      await loadAppAt('/flow/builder/abc-123');
      expect(evaluated.builder).toBe(1);
    });
  });

  describe('Given a path that matches no page', () => {
    it('When the MFE module evaluates Then no page chunk is requested', async () => {
      await loadAppAt('/somewhere/else');
      expect(evaluated.dashboard + evaluated.pending + evaluated.builder).toBe(0);
    });
  });
});
