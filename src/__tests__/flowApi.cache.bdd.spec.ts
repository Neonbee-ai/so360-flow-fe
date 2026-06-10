/**
 * BDD coverage for flowApi's org-static reference cache: it coalesces concurrent
 * reads of definitions/policies/roles, serves them from a short TTL across the
 * pending-approvals poll, keys by org id, invalidates on mutations, and never
 * caches a failed request.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
  return { default: { create: vi.fn(() => mockAxiosInstance) } };
});

import { flowApi, clearFlowRefCache } from '../services/flowApi';

const mock = (axios.create as any)();

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('currentOrgId', 'o1');
  clearFlowRefCache();
});

describe('flowApi reference cache', () => {
  describe('Given concurrent reads of the same org-static resource', () => {
    it('When getApprovalPolicies is called twice before the first resolves / Then the GET is coalesced into one request', async () => {
      let resolve!: (v: any) => void;
      mock.get.mockReturnValue(new Promise((r) => { resolve = r; }));
      const p1 = flowApi.getApprovalPolicies();
      const p2 = flowApi.getApprovalPolicies();
      resolve({ data: [] });
      await Promise.all([p1, p2]);
      expect(mock.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Given repeated reads within the TTL window', () => {
    it('When getFlowDefinitions is called twice in a row / Then the second is served from cache', async () => {
      mock.get.mockResolvedValue({ data: [] });
      await flowApi.getFlowDefinitions();
      await flowApi.getFlowDefinitions();
      expect(mock.get).toHaveBeenCalledTimes(1);
    });

    it('When called with different module codes / Then each variant fetches independently', async () => {
      mock.get.mockResolvedValue({ data: [] });
      await flowApi.getFlowDefinitions('crm');
      await flowApi.getFlowDefinitions('inventory');
      expect(mock.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Given a policy mutation between reads', () => {
    it('When createApprovalPolicy runs / Then the next getApprovalPolicies re-fetches', async () => {
      mock.get.mockResolvedValue({ data: [] });
      mock.post.mockResolvedValue({ data: {} });
      await flowApi.getApprovalPolicies();
      await flowApi.createApprovalPolicy({} as any);
      await flowApi.getApprovalPolicies();
      expect(mock.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Given the active org changes', () => {
    it('When the org id switches between reads / Then the new org fetches its own data', async () => {
      mock.get.mockResolvedValue({ data: [] });
      await flowApi.getRoles();
      localStorage.setItem('currentOrgId', 'o2');
      await flowApi.getRoles();
      expect(mock.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Given a failed read', () => {
    it('When the request rejects / Then the failure is not cached and the next read retries', async () => {
      mock.get.mockRejectedValueOnce(new Error('boom'));
      await expect(flowApi.getFlowDefinitions()).rejects.toThrow('boom');
      mock.get.mockResolvedValueOnce({ data: [{ id: 'd1' }] });
      const res = await flowApi.getFlowDefinitions();
      expect(res.data).toEqual([{ id: 'd1' }]);
      expect(mock.get).toHaveBeenCalledTimes(2);
    });
  });
});
