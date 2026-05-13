export interface FlowState {
    code: string;
    name: string;
    description?: string;
    color?: string;
    is_initial?: boolean;
    is_terminal?: boolean;
    timeout_seconds?: number;
    escalation_transition?: string;
    on_enter?: { side_effects: string[] };
    on_exit?: { side_effects: string[] };
}

export interface FlowTransition {
    code: string;
    name: string;
    from_state: string;
    to_state: string;
    description?: string;
    allowed_roles?: string[];
    conditions?: Record<string, any>;
    requires_approval?: boolean;
    condition_expression?: Record<string, any>;
    side_effects?: string[];
}

export interface FlowDefinition {
    id: string;
    tenant_id: string;
    org_id: string;
    module_code: string;
    name: string;
    description?: string;
    states: FlowState[];
    transitions: FlowTransition[];
    metadata?: Record<string, any>;
    is_active: boolean;
    is_draft?: boolean;
    is_system_flow?: boolean;
    version?: number;
    subscription_tier_required?: 'starter' | 'growth' | 'enterprise';
    industry_tags?: string[];
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface FlowInstance {
    id: string;
    tenant_id: string;
    org_id: string;
    flow_id: string;
    entity_type: string;
    entity_id: string;
    current_state: string;
    status?: 'active' | 'completed' | 'cancelled' | 'suspended';
    context: Record<string, any>;
    timer_state?: Record<string, any>;
    entity_data?: Record<string, any>;
    started_by: string;
    started_at: string;
    completed_by?: string;
    completed_at?: string;
    cancelled_at?: string;
    cancel_reason?: string;
    created_at: string;
    updated_at: string;
    flows?: FlowDefinition;
}

export interface FlowHistory {
    id: string;
    tenant_id: string;
    org_id: string;
    instance_id: string;
    from_state: string | null;
    to_state: string;
    transitioned_by: string;
    transitioned_at: string;
    comment?: string;
    metadata?: Record<string, any>;
}

export interface CreateFlowDefinitionDto {
    module_code: string;
    name: string;
    description?: string;
    states: FlowState[];
    transitions: FlowTransition[];
    metadata?: Record<string, any>;
    is_draft?: boolean;
    subscription_tier_required?: 'starter' | 'growth' | 'enterprise';
    industry_tags?: string[];
}

export interface StartFlowInstanceDto {
    flow_id: string;
    entity_type: string;
    entity_id: string;
    context?: Record<string, any>;
}

export interface TransitionFlowInstanceDto {
    transition_code: string;
    comment?: string;
    metadata?: Record<string, any>;
}

// ===== APPROVAL SYSTEM TYPES =====

export interface ApprovalPolicy {
    id: string;
    tenant_id: string;
    org_id: string;
    entity_type: string;
    name: string;
    description?: string;
    priority: number;
    is_active: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface ApprovalRule {
    id: string;
    policy_id: string;
    condition_expression: any;
    approval_mode: 'SEQUENTIAL' | 'PARALLEL';
    priority: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ApprovalStep {
    id: string;
    rule_id: string;
    step_order: number;
    approver_type: 'ROLE' | 'USER' | 'DYNAMIC_FIELD';
    approver_config: any;
    sla_hours?: number;
    escalation_role?: string;
    can_delegate: boolean;
    delegation_expiry_hours?: number;
    parallel_threshold?: number;
    created_at: string;
}

export interface ApprovalInstance {
    id: string;
    tenant_id: string;
    org_id: string;
    flow_instance_id?: string;
    entity_type: string;
    entity_id: string;
    entity_data?: any;
    policy_id: string;
    rule_id: string;
    current_step_order: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'CANCELLED';
    requested_by: string;
    requested_at: string;
    completed_at?: string;
    metadata?: any;
}

export interface ApprovalAction {
    id: string;
    approval_instance_id: string;
    step_id: string;
    action_type: 'APPROVE' | 'REJECT' | 'DELEGATE' | 'ESCALATE';
    action_by: string;
    action_at: string;
    comment?: string;
    delegated_to_user_id?: string;
    metadata?: any;
}

export interface PendingApproval {
    id: string;
    entity_type: string;
    entity_id: string;
    entity_data: any;
    status: string;
    current_step: ApprovalStep;
    requested_by: string;
    requested_at: string;
    sla_hours?: number;
    time_elapsed_hours: number;
    is_overdue: boolean;
}

export interface ApprovalHistory {
    instance_id: string;
    status: string;
    requested_at: string;
    completed_at?: string;
    actions: ApprovalAction[];
}

export interface CreateApprovalPolicyDto {
    entity_type: string;
    name: string;
    description?: string;
    priority?: number;
}

export interface CreateApprovalRuleDto {
    condition_expression: any;
    approval_mode: 'SEQUENTIAL' | 'PARALLEL';
    priority?: number;
}

export interface CreateApprovalStepDto {
    step_order: number;
    approver_type: 'ROLE' | 'USER' | 'DYNAMIC_FIELD';
    approver_config: any;
    sla_hours?: number;
    escalation_role?: string;
    can_delegate?: boolean;
}

export interface ApprovalActionDto {
    approval_instance_id: string;
    step_id: string;
    action: 'APPROVE' | 'REJECT' | 'DELEGATE';
    comment?: string;
    delegate_to_user_id?: string;
}

export interface ApprovalStats {
    pending_count: number;
    overdue_count: number;
    avg_cycle_hours: number;
    by_entity_type: Record<string, number>;
}

export interface RoleOption {
    role_id: string;
    role_name: string;
    user_count: number;
}
