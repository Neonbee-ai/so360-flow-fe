// Types for the Flow automation rules API (GET/POST /v1/flow/automation/*).

export type TriggerType = 'event' | 'schedule' | 'relative_time';
export type RunStatus =
    | 'pending' | 'scheduled' | 'running' | 'retrying'
    | 'succeeded' | 'failed' | 'skipped' | 'cancelled' | 'dead';

export type ConditionOperator =
    | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
    | 'in' | 'nin' | 'contains' | 'starts_with' | 'ends_with'
    | 'exists' | 'not_exists';

export interface ConditionLeaf { field: string; op: ConditionOperator; value?: unknown }
export interface ConditionGroup { all?: ConditionNode[]; any?: ConditionNode[]; not?: ConditionNode }
export type ConditionNode = ConditionLeaf | ConditionGroup;

export interface RuleAction { type: string; config: Record<string, unknown>; name?: string }

export interface AutomationRule {
    id: string;
    name: string;
    description?: string | null;
    is_enabled: boolean;
    trigger_type: TriggerType;
    trigger_config: Record<string, any>;
    conditions: ConditionNode | null;
    actions: RuleAction[];
    max_depth?: number;
    max_attempts?: number;
    last_run_at?: string | null;
    next_run_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface AutomationRulePayload {
    name: string;
    description?: string | null;
    is_enabled: boolean;
    trigger_type: TriggerType;
    trigger_config: Record<string, unknown>;
    conditions: ConditionNode | null;
    actions: RuleAction[];
}

export interface AutomationRun {
    id: string;
    rule_id: string | null;
    status: RunStatus;
    trigger_kind: TriggerType;
    event_type?: string | null;
    subject_type?: string | null;
    subject_id?: string | null;
    attempt: number;
    max_attempts: number;
    error?: string | null;
    started_at?: string | null;
    finished_at?: string | null;
    created_at?: string;
}

export type ActionFieldType = 'string' | 'text' | 'number' | 'boolean' | 'uuid' | 'datetime' | 'string[]' | 'uuid[]' | 'object' | 'enum';
export interface ActionField {
    key: string;
    label: string;
    type: ActionFieldType;
    required?: boolean;
    options?: string[];
    description?: string;
    templatable?: boolean;
}
export interface ActionCatalogEntry {
    key: string;
    label: string;
    module: string;
    description: string;
    availability: 'ready' | 'requires_module_contract';
    fields: ActionField[];
}
export interface EventCatalogEntry {
    type: string;
    module: string;
    entity?: string;
    description?: string | null;
    live: boolean;
}
export interface AutomationCatalog {
    triggers: {
        kinds: Array<{ type: TriggerType; label: string }>;
        events: EventCatalogEntry[];
        events_error?: string | null;
    };
    actions: ActionCatalogEntry[];
    conditions: { operators: ConditionOperator[]; groups: string[]; paths: string[] };
    templating?: { syntax: string; extra_paths: string[] };
}
