import { describe, it, expect } from 'vitest';
import {
    conditionsFromForm, conditionsToForm, emptyForm, formToPayload, ruleToForm, validateForm, describeTrigger, fieldFromValue,
} from '../utils/automationRule';
import type { ActionCatalogEntry, AutomationRule } from '../types/automation';

const catalog: ActionCatalogEntry[] = [{
    key: 'crm.create_task', label: 'Create task', module: 'crm', description: '', availability: 'ready',
    fields: [
        { key: 'title', label: 'Title', type: 'string', required: true },
        { key: 'due_in_minutes', label: 'Due in', type: 'number' },
        { key: 'user_ids', label: 'Users', type: 'uuid[]' },
        { key: 'context', label: 'Context', type: 'object' },
        { key: 'urgent', label: 'Urgent', type: 'boolean' },
    ],
}];

describe('automation rule form helpers', () => {
    it('Given no conditions, When converted to a payload, Then conditions is null', () => {
        expect(conditionsFromForm(emptyForm())).toBeNull();
    });

    it('Given one condition row, When converted, Then a single leaf is produced with a numeric value', () => {
        const f = { ...emptyForm(), conditions: [{ field: 'data.amount', op: 'gt' as const, value: '1000' }] };
        expect(conditionsFromForm(f)).toEqual({ field: 'data.amount', op: 'gt', value: 1000 });
    });

    it('Given two rows and match any, When converted, Then an any group is produced', () => {
        const f = {
            ...emptyForm(), match: 'any' as const,
            conditions: [{ field: 'a', op: 'eq' as const, value: 'x' }, { field: 'b', op: 'in' as const, value: 'p, q' }],
        };
        expect(conditionsFromForm(f)).toEqual({ any: [{ field: 'a', op: 'eq', value: 'x' }, { field: 'b', op: 'in', value: ['p', 'q'] }] });
    });

    it('Given an exists operator, When converted, Then no value key is emitted', () => {
        const f = { ...emptyForm(), conditions: [{ field: 'data.email', op: 'exists' as const, value: 'ignored' }] };
        expect(conditionsFromForm(f)).toEqual({ field: 'data.email', op: 'exists' });
    });

    it('Given a nested stored condition, When loaded, Then it is preserved verbatim', () => {
        const nested = { all: [{ field: 'a', op: 'eq' as const, value: 1 }, { any: [{ field: 'b', op: 'eq' as const, value: 2 }] }] };
        const form = { ...emptyForm(), ...conditionsToForm(nested) };
        expect(form.rawConditions).toEqual(nested);
        expect(conditionsFromForm(form)).toEqual(nested);
    });

    it('Given a stored flat group, When loaded, Then rows and match mode are editable', () => {
        const r = conditionsToForm({ any: [{ field: 'a', op: 'in', value: [1, 2] }] });
        expect(r).toEqual({ match: 'any', conditions: [{ field: 'a', op: 'in', value: '1, 2' }], rawConditions: null });
    });

    it('Given blank optional action fields, When converted, Then they are omitted from config', () => {
        const form = {
            ...emptyForm(), name: 'R', event_types: ['crm.lead.created'],
            actions: [{ type: 'crm.create_task', name: '', values: { title: 'Call {{data.name}}', due_in_minutes: '', user_ids: 'a, b', context: '{"x":1}', urgent: true } }],
        };
        const p = formToPayload(form, catalog);
        expect(p.actions).toEqual([{ type: 'crm.create_task', config: { title: 'Call {{data.name}}', user_ids: ['a', 'b'], context: { x: 1 }, urgent: true } }]);
        expect(p.trigger_config).toEqual({ event_types: ['crm.lead.created'] });
    });

    it('Given a stored rule, When loaded then saved unchanged, Then the payload round-trips', () => {
        const rule: AutomationRule = {
            id: '1', name: 'N', description: 'D', is_enabled: false, trigger_type: 'relative_time',
            trigger_config: { event_types: ['support.ticket.created'], datetime_field: 'data.due_at', offset_minutes: -30, cancel_on_event_types: ['support.ticket.closed'] },
            conditions: null, actions: [{ type: 'crm.create_task', config: { title: 'T', due_in_minutes: 15 }, name: 'step' }],
        };
        const p = formToPayload(ruleToForm(rule, catalog), catalog);
        expect(p).toMatchObject({ name: 'N', description: 'D', is_enabled: false, trigger_type: 'relative_time', trigger_config: rule.trigger_config, conditions: null, actions: rule.actions });
    });

    it('Given an empty form, When validated, Then name, event and action problems are reported', () => {
        const errs = validateForm(emptyForm(), catalog);
        expect(errs).toEqual(expect.arrayContaining(['Give the rule a name.', 'Pick at least one event for the trigger.', 'Add at least one action.']));
    });

    it('Given a schedule under 5 minutes, When validated, Then the interval is rejected', () => {
        const errs = validateForm({ ...emptyForm(), name: 'n', trigger_type: 'schedule', interval_minutes: '2' }, catalog);
        expect(errs.some((e) => e.includes('at least 5'))).toBe(true);
    });

    it('Given a missing required action field and bad JSON, When validated, Then both are reported', () => {
        const form = { ...emptyForm(), name: 'n', event_types: ['e'], actions: [{ type: 'crm.create_task', name: '', values: { title: '', context: '{bad' } }] };
        const errs = validateForm(form, catalog);
        expect(errs).toEqual(expect.arrayContaining(['Action 1: Title is required.', 'Action 1: Context must be valid JSON.']));
    });

    it('Given each trigger type, When described, Then plain language is returned', () => {
        expect(describeTrigger({ trigger_type: 'schedule', trigger_config: { interval_minutes: 60 } })).toBe('Every 60 min');
        expect(describeTrigger({ trigger_type: 'event', trigger_config: { event_types: ['a', 'b'] } })).toBe('a, b');
        expect(describeTrigger({ trigger_type: 'relative_time', trigger_config: { event_types: ['e'], datetime_field: 'data.due', offset_minutes: -10 } })).toBe('10 min before data.due (from e)');
    });

    it('Given a false boolean, When parsed, Then it is omitted', () => {
        expect(fieldFromValue({ key: 'k', label: 'K', type: 'boolean' }, false)).toBeUndefined();
    });
});
