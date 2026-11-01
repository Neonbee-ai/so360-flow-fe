import { describe, it, expect } from 'vitest';
import { isMalformedRouteParam } from './routeParam';

describe('isMalformedRouteParam', () => {
    it('given an unfilled route placeholder, when checked, then it is malformed', () => {
        expect(isMalformedRouteParam(':id')).toBe(true);
    });
    it('given an empty or missing param, when checked, then it is malformed', () => {
        expect(isMalformedRouteParam('')).toBe(true);
        expect(isMalformedRouteParam(undefined)).toBe(true);
        expect(isMalformedRouteParam(null)).toBe(true);
    });
    it('given text with spaces or punctuation, when checked, then it is malformed', () => {
        expect(isMalformedRouteParam('a b')).toBe(true);
        expect(isMalformedRouteParam('<x>')).toBe(true);
    });
    it('given a UUID, when checked, then it is well formed', () => {
        expect(isMalformedRouteParam('3d3ac861-4acc-4610-8067-043f0303e259')).toBe(false);
    });
    it('given a slug or short id, when checked, then it is well formed', () => {
        expect(isMalformedRouteParam('customers')).toBe(false);
        expect(isMalformedRouteParam('eng-1')).toBe(false);
    });
});
