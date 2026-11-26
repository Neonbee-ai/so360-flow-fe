import { describe, it, expect, vi } from 'vitest';
import { preloadRouteChunk } from './routePreload';

const routes = () => {
    const landing = vi.fn(() => Promise.resolve());
    const pending = vi.fn(() => Promise.resolve());
    return {
        landing, pending,
        list: [
            { pattern: /\/flow\/?$/, load: landing },
            { pattern: /\/approvals\/pending\/?$/, load: pending },
        ],
    };
};

describe('preloadRouteChunk', () => {
    it('given the module landing deep link, when the MFE loads, then only the landing chunk starts downloading', () => {
        const r = routes();
        expect(preloadRouteChunk('/flow', r.list)).toBe(true);
        expect(r.landing).toHaveBeenCalledTimes(1);
        expect(r.pending).not.toHaveBeenCalled();
    });

    it('given a non-landing deep link, when the MFE loads, then that route chunk starts downloading', () => {
        const r = routes();
        expect(preloadRouteChunk('/flow/approvals/pending/', r.list)).toBe(true);
        expect(r.pending).toHaveBeenCalledTimes(1);
        expect(r.landing).not.toHaveBeenCalled();
    });

    it('given an unknown route, when the MFE loads, then no chunk is preloaded', () => {
        const r = routes();
        expect(preloadRouteChunk('/flow/unknown', r.list)).toBe(false);
        expect(r.landing).not.toHaveBeenCalled();
        expect(r.pending).not.toHaveBeenCalled();
    });

    it('given the chunk download fails, when preloading, then the error is swallowed so React.lazy can retry', async () => {
        const failing = vi.fn(() => Promise.reject(new Error('chunk 404')));
        expect(preloadRouteChunk('/flow', [{ pattern: /\/flow\/?$/, load: failing }])).toBe(true);
        await Promise.resolve();
        expect(failing).toHaveBeenCalledTimes(1);
    });
});
