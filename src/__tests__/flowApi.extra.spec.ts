/**
 * Extra coverage for flowApi — approval policy management, stats,
 * simulate, deactivate, roles, and instance endpoints not covered
 * in the primary flowApi.spec.ts.
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

const getApi = () => {
  vi.resetModules();
  return import('../services/flowApi').then(m => m.flowApi);
};

let mock: any;

beforeEach(() => {
  vi.clearAllMocks();
  mock = (axios.create as any)();
});

describe('flowApi (extra)', () => {
  describe('Given createApprovalPolicy', () => {
    it('When called / Then posts to /approval/policies', async () => {
      const api = await getApi();
      const data = { name: 'Finance Policy', entity_type: 'expense', rules: [] };
      mock.post.mockResolvedValue({ data: { id: 'p1' } });
      await api.createApprovalPolicy(data as any);
      expect(mock.post).toHaveBeenCalledWith('/approval/policies', data);
    });
  });

  describe('Given getApprovalPolicies', () => {
    it('When called without entity_type / Then passes undefined param', async () => {
      const api = await getApi();
      mock.get.mockResolvedValue({ data: [] });
      await api.getApprovalPolicies();
      expect(mock.get).toHaveBeenCalledWith('/approval/policies', { params: { entity_type: undefined } });
    });

    it('When called with entity_type / Then passes entity_type param', async () => {
      const api = await getApi();
      mock.get.mockResolvedValue({ data: [] });
      await api.getApprovalPolicies('expense');
      expect(mock.get).toHaveBeenCalledWith('/approval/policies', { params: { entity_type: 'expense' } });
    });
  });

  describe('Given getApprovalPolicy', () => {
    it('When called / Then GETs by policy id', async () => {
      const api = await getApi();
      mock.get.mockResolvedValue({ data: { id: 'p1' } });
      await api.getApprovalPolicy('p1');
      expect(mock.get).toHaveBeenCalledWith('/approval/policies/p1');
    });
  });

  describe('Given createApprovalRule', () => {
    it('When called / Then posts to /approval/policies/:id/rules', async () => {
      const api = await getApi();
      mock.post.mockResolvedValue({ data: { id: 'r1' } });
      const ruleData = { name: 'Finance Rule', conditions: [] };
      await api.createApprovalRule('p1', ruleData as any);
      expect(mock.post).toHaveBeenCalledWith('/approval/policies/p1/rules', ruleData);
    });
  });

  describe('Given createApprovalStep', () => {
    it('When called / Then posts to /approval/rules/:id/steps', async () => {
      const api = await getApi();
      mock.post.mockResolvedValue({ data: { id: 's1' } });
      const stepData = { step_order: 1, approver_type: 'role', approver_id: 'r1' };
      await api.createApprovalStep('r1', stepData as any);
      expect(mock.post).toHaveBeenCalledWith('/approval/rules/r1/steps', stepData);
    });
  });

  describe('Given getRoles', () => {
    it('When called / Then GETs /approval/roles', async () => {
      const api = await getApi();
      mock.get.mockResolvedValue({ data: [] });
      await api.getRoles();
      expect(mock.get).toHaveBeenCalledWith('/approval/roles');
    });
  });

  describe('Given updatePolicy', () => {
    it('When called / Then patches /approval/policies/:id', async () => {
      const api = await getApi();
      mock.patch.mockResolvedValue({ data: { id: 'p1', is_active: false } });
      await api.updatePolicy('p1', { is_active: false });
      expect(mock.patch).toHaveBeenCalledWith('/approval/policies/p1', { is_active: false });
    });
  });

  describe('Given deactivatePolicy', () => {
    it('When called / Then deletes /approval/policies/:id', async () => {
      const api = await getApi();
      mock.delete.mockResolvedValue({ data: {} });
      await api.deactivatePolicy('p1');
      expect(mock.delete).toHaveBeenCalledWith('/approval/policies/p1');
    });
  });

  describe('Given simulatePolicy', () => {
    it('When called / Then posts to /approval/policies/:id/simulate', async () => {
      const api = await getApi();
      mock.post.mockResolvedValue({ data: { matched: true } });
      const entityData = { amount: 5000 };
      await api.simulatePolicy('p1', entityData);
      expect(mock.post).toHaveBeenCalledWith('/approval/policies/p1/simulate', { entity_data: entityData });
    });
  });

  describe('Given getApprovalStats', () => {
    it('When called / Then GETs /approval/stats', async () => {
      const api = await getApi();
      mock.get.mockResolvedValue({ data: { pending_count: 5 } });
      await api.getApprovalStats();
      expect(mock.get).toHaveBeenCalledWith('/approval/stats');
    });
  });

  describe('Given getFlowInstancesByEntity', () => {
    it('When called / Then GETs /instances/:entityType/:entityId', async () => {
      const api = await getApi();
      mock.get.mockResolvedValue({ data: [] });
      await api.getFlowInstancesByEntity('deal', 'd1');
      expect(mock.get).toHaveBeenCalledWith('/instances/deal/d1');
    });
  });

  describe('Given getFlowInstance', () => {
    it('When called / Then GETs /instances/:id', async () => {
      const api = await getApi();
      mock.get.mockResolvedValue({ data: { id: 'i1' } });
      await api.getFlowInstance('i1');
      expect(mock.get).toHaveBeenCalledWith('/instances/i1');
    });
  });

  describe('Given getFlowInstanceHistory', () => {
    it('When called / Then GETs /instances/:id/history', async () => {
      const api = await getApi();
      mock.get.mockResolvedValue({ data: [] });
      await api.getFlowInstanceHistory('i1');
      expect(mock.get).toHaveBeenCalledWith('/instances/i1/history');
    });
  });

  describe('Given updateFlowDefinition', () => {
    it('When called / Then PUTs to /definitions/:id', async () => {
      const api = await getApi();
      mock.put.mockResolvedValue({ data: { id: 'f1', name: 'Updated' } });
      await api.updateFlowDefinition('f1', { name: 'Updated' });
      expect(mock.put).toHaveBeenCalledWith('/definitions/f1', { name: 'Updated' });
    });
  });
});
