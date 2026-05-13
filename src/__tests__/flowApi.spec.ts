import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  };
  return { default: { create: vi.fn(() => mockAxiosInstance) } };
});

const getApi = () => {
  vi.resetModules();
  return import('../services/flowApi').then(m => m.flowApi);
};

let mockAxiosInstance: any;

beforeEach(() => {
  vi.clearAllMocks();
  mockAxiosInstance = (axios.create as any)();
});

describe('flowApi', () => {
  describe('Given the API client is initialized', () => {
    it('When createFlowDefinition is called / Then posts to /definitions', async () => {
      const flowApi = await getApi();
      const data = { name: 'Test', module_code: 'crm', states: [], transitions: [] };
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 'f1' } });
      await flowApi.createFlowDefinition(data as any);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/definitions', data);
    });

    it('When getFlowDefinitions is called / Then gets from /definitions', async () => {
      const flowApi = await getApi();
      mockAxiosInstance.get.mockResolvedValue({ data: [] });
      await flowApi.getFlowDefinitions();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/definitions', { params: { module_code: undefined } });
    });

    it('When getFlowDefinition is called / Then gets by id', async () => {
      const flowApi = await getApi();
      mockAxiosInstance.get.mockResolvedValue({ data: { id: 'f1' } });
      await flowApi.getFlowDefinition('f1');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/definitions/f1');
    });

    it('When startFlowInstance is called / Then posts to /instances/start', async () => {
      const flowApi = await getApi();
      const dto = { flow_id: 'f1', entity_type: 'deal', entity_id: 'd1' };
      mockAxiosInstance.post.mockResolvedValue({ data: {} });
      await flowApi.startFlowInstance(dto as any);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/instances/start', dto);
    });

    it('When transitionFlowInstance is called / Then posts transition', async () => {
      const flowApi = await getApi();
      const dto = { transition_code: 'submit' };
      mockAxiosInstance.post.mockResolvedValue({ data: {} });
      await flowApi.transitionFlowInstance('i1', dto);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/instances/i1/transition', dto);
    });

    it('When getFlowInstanceContext is called / Then gets context', async () => {
      const flowApi = await getApi();
      mockAxiosInstance.get.mockResolvedValue({ data: {} });
      await flowApi.getFlowInstanceContext('i1');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/instances/i1/context');
    });

    it('When performApprovalAction is called / Then posts action', async () => {
      const flowApi = await getApi();
      const dto = { instance_id: 'i1', action_type: 'APPROVE' };
      mockAxiosInstance.post.mockResolvedValue({ data: {} });
      await flowApi.performApprovalAction(dto as any);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/approval/action', dto);
    });

    it('When getPendingApprovals is called / Then gets pending', async () => {
      const flowApi = await getApi();
      mockAxiosInstance.get.mockResolvedValue({ data: [] });
      await flowApi.getPendingApprovals();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/approval/pending');
    });

    it('When getApprovalHistory is called / Then gets history', async () => {
      const flowApi = await getApi();
      mockAxiosInstance.get.mockResolvedValue({ data: [] });
      await flowApi.getApprovalHistory('deal', 'd1');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/approval/history/deal/d1');
    });

    it('When createApprovalPolicy is called / Then posts policy', async () => {
      const flowApi = await getApi();
      const data = { name: 'Test', module_code: 'crm', entity_type: 'deal' };
      mockAxiosInstance.post.mockResolvedValue({ data: {} });
      await flowApi.createApprovalPolicy(data as any);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/approval/policies', data);
    });

    it('When getApprovalPolicies is called / Then gets policies', async () => {
      const flowApi = await getApi();
      mockAxiosInstance.get.mockResolvedValue({ data: [] });
      await flowApi.getApprovalPolicies();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/approval/policies', { params: { entity_type: undefined } });
    });

    it('When getAllInstances is called / Then gets instances', async () => {
      const flowApi = await getApi();
      mockAxiosInstance.get.mockResolvedValue({ data: { data: [], total: 0 } });
      await flowApi.getAllInstances({ entity_type: 'deal' });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/instances', { params: { entity_type: 'deal' } });
    });

    it('When updateFlowDefinition is called / Then puts data', async () => {
      const flowApi = await getApi();
      mockAxiosInstance.put.mockResolvedValue({ data: {} });
      await flowApi.updateFlowDefinition('f1', { name: 'Updated' } as any);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/definitions/f1', { name: 'Updated' });
    });

    it('When getFlowInstancesByEntity is called / Then gets by entity type and id', async () => {
      const flowApi = await getApi();
      mockAxiosInstance.get.mockResolvedValue({ data: [] });
      await flowApi.getFlowInstancesByEntity('deal', 'd1');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/instances/deal/d1');
    });

    it('When getFlowInstance is called / Then gets by instance id', async () => {
      const flowApi = await getApi();
      mockAxiosInstance.get.mockResolvedValue({ data: { id: 'i1' } });
      await flowApi.getFlowInstance('i1');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/instances/i1');
    });

    it('When getFlowInstanceHistory is called / Then gets history', async () => {
      const flowApi = await getApi();
      mockAxiosInstance.get.mockResolvedValue({ data: [] });
      await flowApi.getFlowInstanceHistory('i1');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/instances/i1/history');
    });

    it('When getApprovalPolicy is called / Then gets by policy id', async () => {
      const flowApi = await getApi();
      mockAxiosInstance.get.mockResolvedValue({ data: { id: 'p1' } });
      await flowApi.getApprovalPolicy('p1');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/approval/policies/p1');
    });

    it('When createApprovalRule is called / Then posts rule for policy', async () => {
      const flowApi = await getApi();
      const ruleData = { name: 'Amount > 1000', conditions: [] };
      mockAxiosInstance.post.mockResolvedValue({ data: {} });
      await flowApi.createApprovalRule('p1', ruleData as any);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/approval/policies/p1/rules', ruleData);
    });

    it('When createApprovalStep is called / Then posts step for rule', async () => {
      const flowApi = await getApi();
      const stepData = { approver_type: 'user', approver_id: 'u1' };
      mockAxiosInstance.post.mockResolvedValue({ data: {} });
      await flowApi.createApprovalStep('r1', stepData as any);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/approval/rules/r1/steps', stepData);
    });
  });
});
