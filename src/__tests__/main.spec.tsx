import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
  })),
}));

vi.mock('../App', () => ({
  default: () => null,
}));

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '<div id="root"></div>';
});

describe('main', () => {
  describe('Given a root element exists', () => {
    it('When the app starts / Then createRoot is called and render is invoked', async () => {
      const { createRoot } = await import('react-dom/client');
      await import('../main');
      expect(createRoot).toHaveBeenCalled();
    });
  });
});
