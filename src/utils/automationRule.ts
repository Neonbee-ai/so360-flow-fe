import type {
    ActionCatalogEntry, ActionField, AutomationRule, AutomationRulePayload, ConditionLeaf, ConditionNode,
    ConditionOperator, RuleAction, TriggerType,
} from '../types/automation';

export const MIN_SCHEDULE_INTERVAL_MINUTES = 5;
export const NO_VALUE_OPERATORS: ConditionOperator[] = ['exists', 'not_exists'];
const LIST_OPERATORS: ConditionOperator[] = ['in', 'nin'];

export interface ConditionRow { field: string; op: ConditionOperator; value: string }
export interface ActionRow { type: string; name: string; values: Record<string, string | boolean> }

export interface RuleForm {
    name: string;
    description: string;
    is_enabled: boolean;
    trigger_type: TriggerType;
    event_types: string[];
    interval_minutes: string;
    start_at: string;
    datetime_field: string;
    offset_minutes: string;
    cancel_on_event_types: string[];
    match: 'all' | 'any';
    conditions: ConditionRow[];
    /** Set when the stored conditions are nested beyond what the builder edits; kept verbatim. */
    rawConditions: ConditionNode | null;
    actions: ActionRow[];
}

export const emptyForm = (): RuleForm => ({
    name: '', description: '', is_enabled: true, trigger_type: 'event',
    event_types: [''], interval_minutes: '60', start_at: '', datetime_field: '', offset_minutes: '0',
    cancel_on_event_types: [], match: 'all', conditions: [], rawConditions: null, actions: [],
});

const isLeaf = (n: ConditionNode): n is ConditionLeaf => !!n && typeof (n as ConditionLeaf).field === 'string';

const valueToText = (v: unknown): string => {
    if (v === undefined || v === null) return '';
    if (Array.isArray(v)) return v.map(String).join(', ');
    return String(v);
};

const parseScalar = (raw: string): unknown => {
    const t = raw.trim();
    if (t === 'true') return true;
    if (t === 'false') return false;
    if (t !== '' && !Number.isNaN(Number(t))) return Number(t);
    return t;
};

export const parseConditionValue = (op: ConditionOperator, raw: string): unknown => {
    if (NO_VALUE_OPERATORS.includes(op)) return undefined;
    if (LIST_OPERATORS.includes(op)) return raw.split(',').map((s) => s.trim()).filter(Boolean).map(parseScalar);
    return parseScalar(raw);
};

/** Flat (single leaf, or one all/any group of leaves) conditions are editable; anything else is preserved raw. */
export function conditionsToForm(node: ConditionNode | null | undefined): Pick<RuleForm, 'match' | 'conditions' | 'rawConditions'> {
    if (!node) return { match: 'all', conditions: [], rawConditions: null };
    if (isLeaf(node)) {
        return { match: 'all', conditions: [{ field: node.field, op: node.op, value: valueToText(node.value) }], rawConditions: null };
    }
    const group = node as { all?: ConditionNode[]; any?: ConditionNode[]; not?: ConditionNode };
    const key = group.all ? 'all' : group.any ? 'any' : null;
    const children = key ? (group[key] as ConditionNode[]) : null;
    if (key && children && !group.not && children.every(isLeaf) && !(group.all && group.any)) {
        return {
            match: key,
            conditions: (children as ConditionLeaf[]).map((l) => ({ field: l.field, op: l.op, value: valueToText(l.value) })),
            rawConditions: null,
        };
    }
    return { match: 'all', conditions: [], rawConditions: node };
}

export function conditionsFromForm(form: Pick<RuleForm, 'match' | 'conditions' | 'rawConditions'>): ConditionNode | null {
    if (form.rawConditions) return form.rawConditions;
    const leaves: ConditionLeaf[] = form.conditions
        .filter((c) => c.field.trim())
        .map((c) => {
            const value = parseConditionValue(c.op, c.value);
            return value === undefined ? { field: c.field.trim(), op: c.op } : { field: c.field.trim(), op: c.op, value };
        });
    if (leaves.length === 0) return null;
    if (leaves.length === 1) return leaves[0];
    return { [form.match]: leaves } as ConditionNode;
}

const splitList = (raw: string) => raw.split(',').map((s) => s.trim()).filter(Boolean);

function fieldToValue(field: ActionField, raw: unknown): string | boolean {
    if (field.type === 'boolean') return raw === true;
    if (field.type === 'object') return raw && typeof raw === 'object' ? JSON.stringify(raw, null, 2) : '';
    return valueToText(raw);
}

/** Returns undefined for blank optional values so they are omitted from the payload. */
export function fieldFromValue(field: ActionField, raw: string | boolean | undefined): unknown {
    if (field.type === 'boolean') return raw === true ? true : undefined;
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (text === '') return undefined;
    if (field.type === 'number') return Number(text);
    if (field.type === 'string[]' || field.type === 'uuid[]') return splitList(text);
    if (field.type === 'object') return JSON.parse(text);
    return text;
}

export function actionsToForm(actions: RuleAction[], catalog: ActionCatalogEntry[]): ActionRow[] {
    return (actions ?? []).map((a) => {
        const entry = catalog.find((c) => c.key === a.type);
        const values: Record<string, string | boolean> = {};
        (entry?.fields ?? []).forEach((f) => { values[f.key] = fieldToValue(f, a.config?.[f.key]); });
        return { type: a.type, name: a.name ?? '', values };
    });
}

export function actionsFromForm(rows: ActionRow[], catalog: ActionCatalogEntry[]): RuleAction[] {
    return rows.map((row) => {
        const entry = catalog.find((c) => c.key === row.type);
        const config: Record<string, unknown> = {};
        (entry?.fields ?? []).forEach((f) => {
            const v = fieldFromValue(f, row.values[f.key]);
            if (v !== undefined) config[f.key] = v;
        });
        return row.name.trim() ? { type: row.type, config, name: row.name.trim() } : { type: row.type, config };
    });
}

export function ruleToForm(rule: AutomationRule, catalog: ActionCatalogEntry[]): RuleForm {
    const tc = rule.trigger_config ?? {};
    return {
        name: rule.name, description: rule.description ?? '', is_enabled: rule.is_enabled, trigger_type: rule.trigger_type,
        event_types: Array.isArray(tc.event_types) && tc.event_types.length ? tc.event_types : [''],
        interval_minutes: tc.interval_minutes != null ? String(tc.interval_minutes) : '60',
        start_at: tc.start_at ?? '',
        datetime_field: tc.datetime_field ?? '',
        offset_minutes: tc.offset_minutes != null ? String(tc.offset_minutes) : '0',
        cancel_on_event_types: Array.isArray(tc.cancel_on_event_types) ? tc.cancel_on_event_types : [],
        ...conditionsToForm(rule.conditions),
        actions: actionsToForm(rule.actions, catalog),
    };
}

export function triggerConfigFromForm(form: RuleForm): Record<string, unknown> {
    const events = form.event_types.map((e) => e.trim()).filter(Boolean);
    if (form.trigger_type === 'event') return { event_types: events };
    if (form.trigger_type === 'schedule') {
        return { interval_minutes: Number(form.interval_minutes), ...(form.start_at ? { start_at: form.start_at } : {}) };
    }
    const cancel = form.cancel_on_event_types.map((e) => e.trim()).filter(Boolean);
    return {
        event_types: events, datetime_field: form.datetime_field.trim(), offset_minutes: Number(form.offset_minutes),
        ...(cancel.length ? { cancel_on_event_types: cancel } : {}),
    };
}

/** Client-side checks so the common mistakes are caught before the round trip. Server stays authoritative. */
export function validateForm(form: RuleForm, catalog: ActionCatalogEntry[]): string[] {
    const errors: string[] = [];
    if (!form.name.trim()) errors.push('Give the rule a name.');
    if (form.trigger_type !== 'schedule' && form.event_types.every((e) => !e.trim())) errors.push('Pick at least one event for the trigger.');
    if (form.trigger_type === 'schedule') {
        const n = Number(form.interval_minutes);
        if (!Number.isInteger(n) || n < MIN_SCHEDULE_INTERVAL_MINUTES) errors.push(`Schedule interval must be a whole number of at least ${MIN_SCHEDULE_INTERVAL_MINUTES} minutes.`);
    }
    if (form.trigger_type === 'relative_time') {
        if (!form.datetime_field.trim()) errors.push('Say which date field the timing is relative to.');
        if (!Number.isInteger(Number(form.offset_minutes))) errors.push('Offset must be a whole number of minutes.');
    }
    if (form.actions.length === 0) errors.push('Add at least one action.');
    form.actions.forEach((row, i) => {
        const entry = catalog.find((c) => c.key === row.type);
        if (!entry) { errors.push(`Action ${i + 1}: choose what to do.`); return; }
        entry.fields.forEach((f) => {
            try {
                const v = fieldFromValue(f, row.values[f.key]);
                if (f.required && (v === undefined || (Array.isArray(v) && v.length === 0))) errors.push(`Action ${i + 1}: ${f.label} is required.`);
            } catch {
                errors.push(`Action ${i + 1}: ${f.label} must be valid JSON.`);
            }
        });
    });
    return errors;
}

export function formToPayload(form: RuleForm, catalog: ActionCatalogEntry[]): AutomationRulePayload {
    return {
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_enabled: form.is_enabled,
        trigger_type: form.trigger_type,
        trigger_config: triggerConfigFromForm(form),
        conditions: conditionsFromForm(form),
        actions: actionsFromForm(form.actions, catalog),
    };
}

/** Plain-language one-liner for the rules list. */
export function describeTrigger(rule: Pick<AutomationRule, 'trigger_type' | 'trigger_config'>): string {
    const tc = rule.trigger_config ?? {};
    if (rule.trigger_type === 'schedule') return `Every ${tc.interval_minutes ?? '?'} min`;
    const events = Array.isArray(tc.event_types) ? tc.event_types.join(', ') : '';
    if (rule.trigger_type === 'relative_time') {
        const off = Number(tc.offset_minutes ?? 0);
        const when = off === 0 ? 'at' : off < 0 ? `${Math.abs(off)} min before` : `${off} min after`;
        return `${when} ${tc.datetime_field ?? 'date'} (from ${events})`;
    }
    return events || 'No event';
}
