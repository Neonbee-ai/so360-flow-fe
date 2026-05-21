import axios from 'axios';
import type {
    FlowDefinition,
    FlowInstance,
    FlowHistory,
    CreateFlowDefinitionDto,
    StartFlowInstanceDto,
    TransitionFlowInstanceDto,
    ApprovalPolicy,
    PendingApproval,
    ApprovalHistory,
    ApprovalActionDto,
    CreateApprovalPolicyDto,
    CreateApprovalRuleDto,
    CreateApprovalStepDto,
} from '../types/flow';

// Flow BE controller is @Controller('v1/flow'). Gateway strips the module prefix (/flow/)
// so we must include /v1/flow in the path. In dev, proxy passes /v1/flow/* unchanged.
const _flowGateway = (typeof window !== 'undefined' && (window as any).VITE_SO360_FLOW_API) || (import.meta as any).env?.VITE_SO360_FLOW_API;
const api = axios.create({
    baseURL: _flowGateway ? `${_flowGateway}/v1/flow` : '/v1/flow',
});

// Interceptor to inject tenant/org/auth headers
api.interceptors.request.use((config) => {
    const tenantId = localStorage.getItem('currentTenantId');
    const orgId = localStorage.getItem('currentOrgId');
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('flowAuthToken');

    if (tenantId) config.headers['X-Tenant-Id'] = tenantId;
    if (orgId) config.headers['X-Org-Id'] = orgId;
    if (userId) config.headers['X-User-Id'] = userId;
    if (token) config.headers['Authorization'] = `Bearer ${token}`;

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 402 && error.response?.data?.error === 'QUOTA_EXCEEDED') {
            window.dispatchEvent(new CustomEvent('__so360_quota_exceeded', { detail: error.response.data.resolution || error.response.data }));
        }
        return Promise.reject(error);
    },
);

export const flowApi = {
    // Flow Definitions
    createFlowDefinition: (data: CreateFlowDefinitionDto) =>
        api.post<FlowDefinition>('/definitions', data),

    getFlowDefinitions: (moduleCode?: string) =>
        api.get<FlowDefinition[]>('/definitions', { params: { module_code: moduleCode } }),
    getAllInstances: (params?: { entity_type?: string; status?: string; limit?: number; offset?: number }) =>
        api.get<{ data: FlowInstance[]; total: number; limit: number; offset: number }>('/instances', { params }),


    getFlowDefinition: (flowId: string) =>
        api.get<FlowDefinition>(`/definitions/${flowId}`),

    updateFlowDefinition: (flowId: string, data: Partial<CreateFlowDefinitionDto>) =>
        api.put<FlowDefinition>(`/definitions/${flowId}`, data),

    // Flow Instances
    startFlowInstance: (data: StartFlowInstanceDto) =>
        api.post<FlowInstance>('/instances/start', data),

    transitionFlowInstance: (instanceId: string, data: TransitionFlowInstanceDto) =>
        api.post<FlowInstance>(`/instances/${instanceId}/transition`, data),

    getFlowInstancesByEntity: (entityType: string, entityId: string) =>
        api.get<FlowInstance[]>(`/instances/${entityType}/${entityId}`),

    getFlowInstance: (instanceId: string) =>
        api.get<FlowInstance>(`/instances/${instanceId}`),

    getFlowInstanceContext: (instanceId: string) =>
        api.get<{
            instance: FlowInstance;
            history: FlowHistory[];
            available_transitions: any[];
        }>(`/instances/${instanceId}/context`),

    getFlowInstanceHistory: (instanceId: string) =>
        api.get<FlowHistory[]>(`/instances/${instanceId}/history`),

    // ===== APPROVAL SYSTEM METHODS =====

    // Approval Actions
    performApprovalAction: (data: ApprovalActionDto) =>
        api.post('/approval/action', data),

    getPendingApprovals: () =>
        api.get<PendingApproval[]>('/approval/pending'),

    getApprovalHistory: (entityType: string, entityId: string) =>
        api.get<ApprovalHistory[]>(`/approval/history/${entityType}/${entityId}`),

    // Policy Management
    createApprovalPolicy: (data: CreateApprovalPolicyDto) =>
        api.post<ApprovalPolicy>('/approval/policies', data),

    getApprovalPolicies: (entityType?: string) =>
        api.get<ApprovalPolicy[]>('/approval/policies', { params: { entity_type: entityType } }),

    getApprovalPolicy: (policyId: string) =>
        api.get<ApprovalPolicy>(`/approval/policies/${policyId}`),

    createApprovalRule: (policyId: string, data: CreateApprovalRuleDto) =>
        api.post(`/approval/policies/${policyId}/rules`, data),

    createApprovalStep: (ruleId: string, data: CreateApprovalStepDto) =>
        api.post(`/approval/rules/${ruleId}/steps`, data),

    getRoles: () =>
        api.get('/approval/roles'),

    updatePolicy: (policyId: string, data: { name?: string; description?: string; priority?: number; is_active?: boolean }) =>
        api.patch(`/approval/policies/${policyId}`, data),

    deactivatePolicy: (policyId: string) =>
        api.delete(`/approval/policies/${policyId}`),

    simulatePolicy: (policyId: string, entityData: any) =>
        api.post(`/approval/policies/${policyId}/simulate`, { entity_data: entityData }),

    getApprovalStats: () =>
        api.get('/approval/stats'),
};
