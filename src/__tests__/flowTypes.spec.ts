import { describe, it, expect } from 'vitest';

describe('Flow types', () => {
  describe('Given the flow type module', () => {
    it('When imported / Then the module loads successfully', async () => {
      const mod = await import('../types/flow');
      expect(mod).toBeDefined();
    });
  });
});
