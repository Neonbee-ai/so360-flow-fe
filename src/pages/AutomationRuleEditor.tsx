import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Save, Trash2 } from 'lucide-react';
import {
    toast, Button, Checkbox, Cluster, FormPageTemplate, IconButton, Select, Skeleton, Stack, TextField, Textarea,
} from '@so360/design-system';
import { flowApi } from '../services/flowApi';
import type { ActionCatalogEntry, ActionField, AutomationCatalog, ConditionOperator, TriggerType } from '../types/automation';
import {
    NO_VALUE_OPERATORS, emptyForm, formToPayload, ruleToForm, validateForm, type ActionRow, type ConditionRow, type RuleForm,
} from '../utils/automationRule';

const OPERATOR_LABEL: Record<ConditionOperator, string> = {
    eq: 'is', neq: 'is not', gt: 'is greater than', gte: 'is at least', lt: 'is less than', lte: 'is at most',
    in: 'is one of', nin: 'is none of', contains: 'contains', starts_with: 'starts with', ends_with: 'ends with',
    exists: 'has a value', not_exists: 'is empty',
};
const DEFAULT_OPERATORS = Object.keys(OPERATOR_LABEL) as ConditionOperator[];
const TRIGGER_OPTIONS: { value: TriggerType; label: string }[] = [
    { value: 'event', label: 'When an event happens' },
    { value: 'schedule', label: 'On a schedule' },
    { value: 'relative_time', label: 'Before / after a date on a record' },
];

const EMPTY_CATALOG: AutomationCatalog = {
    triggers: { kinds: [], events: [] }, actions: [], conditions: { operators: DEFAULT_OPERATORS, groups: [], paths: [] },
};

export const AutomationRuleEditor = () => {
    const { ruleId } = useParams<{ ruleId: string }>();
    const isNew = !ruleId || ruleId === 'new';
    const navigate = useNavigate();
    const [catalog, setCatalog] = useState<AutomationCatalog>(EMPTY_CATALOG);
    const [form, setForm] = useState<RuleForm>(emptyForm());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const cat = (await flowApi.getAutomationCatalog()).data;
                if (cancelled) return;
                setCatalog(cat);
                if (!isNew) {
                    const rule = (await flowApi.getAutomationRule(ruleId!)).data;
                    if (!cancelled) setForm(ruleToForm(rule, cat.actions));
                }
            } catch {
                if (!cancelled) {
                    const msg = 'Could not load the automation catalog.';
                    setLoadError(msg);
                    setErrors([msg]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [ruleId, isNew]);

    const patch = (p: Partial<RuleForm>) => setForm((f) => ({ ...f, ...p }));
    const listTrail = [{ label: 'Automations', onClick: () => navigate('/flow/automation') }];

    const eventOptions = useMemo(() => {
        const known = new Set(catalog.triggers.events.map((e) => e.type));
        const extra = [...form.event_types, ...form.cancel_on_event_types].filter((t) => t && !known.has(t));
        return [
            { value: '', label: 'Choose an event' },
            ...catalog.triggers.events.map((e) => ({ value: e.type, label: e.live ? e.type : `${e.type} (not emitting yet)` })),
            ...extra.map((t) => ({ value: t, label: t })),
        ];
    }, [catalog, form.event_types, form.cancel_on_event_types]);

    const operators = catalog.conditions.operators.length ? catalog.conditions.operators : DEFAULT_OPERATORS;
    const actionOptions = [
        { value: '', label: 'Choose an action' },
        ...catalog.actions.map((a) => ({ value: a.key, label: a.availability === 'ready' ? a.label : `${a.label} (needs module support)` })),
    ];

    const save = async () => {
        const problems = validateForm(form, catalog.actions);
        setErrors(loadError ? [loadError, ...problems] : problems);
        if (problems.length || loadError) return;
        setSaving(true);
        try {
            const payload = formToPayload(form, catalog.actions);
            if (isNew) await flowApi.createAutomationRule(payload);
            else await flowApi.updateAutomationRule(ruleId!, payload);
            toast.success(isNew ? 'Rule created' : 'Rule saved');
            navigate('/flow/automation');
        } catch { /* Error toast comes from the flowApi interceptor. */ }
        finally { setSaving(false); }
    };

    // ---- list editors ------------------------------------------------------
    const renderEventList = (key: 'event_types' | 'cancel_on_event_types', label: string) => (
        <Stack gap="tight">
            {form[key].map((value, i) => (
                <Cluster key={`${key}-${i}`} gap="tight">
                    <Select
                        name={`${key}-${i}`}
                        label={i === 0 ? label : undefined}
                        value={value}
                        options={eventOptions}
                        onChange={(e) => patch({ [key]: form[key].map((v, j) => (j === i ? e.target.value : v)) } as Partial<RuleForm>)}
                    />
                    {(form[key].length > 1 || key === 'cancel_on_event_types') && (
                        <IconButton
                            label="Remove event"
                            icon={<Trash2 className="w-4 h-4" />}
                            onClick={() => patch({ [key]: form[key].filter((_, j) => j !== i) } as Partial<RuleForm>)}
                        />
                    )}
                </Cluster>
            ))}
            <Cluster>
                <Button variant="secondary" size="sm" onClick={() => patch({ [key]: [...form[key], ''] } as Partial<RuleForm>)}>
                    <Plus className="w-4 h-4" />
                    {key === 'event_types' ? 'Add another event' : 'Add cancelling event'}
                </Button>
            </Cluster>
        </Stack>
    );

    const setCondition = (i: number, p: Partial<ConditionRow>) =>
        patch({ conditions: form.conditions.map((c, j) => (j === i ? { ...c, ...p } : c)) });

    const setActionRow = (i: number, p: Partial<ActionRow>) =>
        patch({ actions: form.actions.map((a, j) => (j === i ? { ...a, ...p } : a)) });

    const renderField = (row: ActionRow, i: number, field: ActionField) => {
        const name = `action-${i}-${field.key}`;
        const label = field.required ? `${field.label} *` : field.label;
        const hint = field.templatable ? `${field.description ?? ''} Use {{data.field}} to insert event values.`.trim() : field.description;
        const set = (v: string | boolean) => setActionRow(i, { values: { ...row.values, [field.key]: v } });
        const val = row.values[field.key];
        if (field.type === 'boolean') {
            return <Checkbox key={name} name={name} label={field.label} checked={val === true} onChange={(e) => set(e.target.checked)} />;
        }
        if (field.type === 'enum') {
            return (
                <Select
                    key={name} name={name} label={label} value={String(val ?? '')}
                    options={[{ value: '', label: 'Not set' }, ...(field.options ?? []).map((o) => ({ value: o, label: o }))]}
                    onChange={(e) => set(e.target.value)}
                />
            );
        }
        if (field.type === 'text' || field.type === 'object') {
            return (
                <Textarea
                    key={name} name={name} label={label} hint={field.type === 'object' ? 'JSON object' : hint}
                    value={String(val ?? '')} onChange={(e) => set(e.target.value)}
                />
            );
        }
        const listHint = field.type === 'string[]' || field.type === 'uuid[]' ? 'Comma-separated' : hint;
        return (
            <TextField
                key={name} name={name} label={label} hint={listHint}
                type={field.type === 'number' ? 'number' : 'text'}
                value={String(val ?? '')} onChange={(e) => set(e.target.value)}
            />
        );
    };

    const changeActionType = (i: number, type: string) => {
        const entry: ActionCatalogEntry | undefined = catalog.actions.find((a) => a.key === type);
        const values: Record<string, string | boolean> = {};
        (entry?.fields ?? []).forEach((f) => { values[f.key] = f.type === 'boolean' ? false : ''; });
        setActionRow(i, { type, values });
    };

    if (loading) {
        return (
            <FormPageTemplate title={isNew ? 'New automation rule' : 'Edit automation rule'} trail={listTrail}>
                <div role="status" aria-busy="true" className="p-4"><span className="sr-only">Loading…</span><Skeleton variant="rect" className="h-10 w-1/3 mb-4" /><Skeleton lines={6} /></div>
            </FormPageTemplate>
        );
    }

    const needsEvents = form.trigger_type !== 'schedule';

    return (
        <FormPageTemplate
            title={isNew ? 'New automation rule' : 'Edit automation rule'}
            description="When this happens, do that."
            trail={listTrail}
            onCancel={() => navigate('/flow/automation')}
            primaryAction={
                <Button onClick={save} disabled={saving}>
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save rule'}
                </Button>
            }
            sections={[
                {
                    id: 'basics',
                    title: 'Rule',
                    content: (
                        <Stack gap="default">
                            {errors.length > 0 && (
                                <div role="alert" className="rounded-lg border border-danger/30 bg-danger-container/20 p-4 text-danger text-sm">
                                    <ul>{errors.map((m) => <li key={m}>{m}</li>)}</ul>
                                </div>
                            )}
                            <TextField name="rule-name" label="Name *" value={form.name} placeholder="e.g. Welcome new leads"
                                onChange={(e) => patch({ name: e.target.value })} />
                            <Textarea name="rule-description" label="Description" value={form.description}
                                onChange={(e) => patch({ description: e.target.value })} />
                            <Checkbox name="rule-enabled" label="Enabled" checked={form.is_enabled}
                                onChange={(e) => patch({ is_enabled: e.target.checked })} />
                        </Stack>
                    ),
                },
                {
                    id: 'trigger',
                    title: 'When this happens',
                    content: (
                        <Stack gap="default">
                            <Select name="trigger-type" label="Trigger" value={form.trigger_type} options={TRIGGER_OPTIONS}
                                onChange={(e) => patch({ trigger_type: e.target.value as TriggerType })} />
                            {needsEvents && renderEventList('event_types', form.trigger_type === 'event' ? 'Event' : 'Event that sets the date')}
                            {form.trigger_type === 'schedule' && (
                                <>
                                    <TextField name="interval-minutes" type="number" label="Run every (minutes) *" hint="At least 5"
                                        value={form.interval_minutes} onChange={(e) => patch({ interval_minutes: e.target.value })} />
                                    <TextField name="start-at" label="Start at" hint="Optional ISO date-time"
                                        value={form.start_at} onChange={(e) => patch({ start_at: e.target.value })} />
                                </>
                            )}
                            {form.trigger_type === 'relative_time' && (
                                <>
                                    <TextField name="datetime-field" label="Date field *" hint="Path on the event, e.g. data.due_at"
                                        value={form.datetime_field} onChange={(e) => patch({ datetime_field: e.target.value })} />
                                    <TextField name="offset-minutes" type="number" label="Offset (minutes) *" hint="Negative = before the date, positive = after"
                                        value={form.offset_minutes} onChange={(e) => patch({ offset_minutes: e.target.value })} />
                                    {renderEventList('cancel_on_event_types', 'Cancel if this event happens')}
                                </>
                            )}
                        </Stack>
                    ),
                },
                {
                    id: 'conditions',
                    title: 'Only if (optional)',
                    content: form.rawConditions ? (
                        <Stack gap="tight">
                            <p className="text-sm text-fg-muted">
                                This rule uses nested conditions that the builder keeps as they are.
                            </p>
                            <Cluster>
                                <Button variant="secondary" size="sm" onClick={() => patch({ rawConditions: null, conditions: [] })}>
                                    Replace with simple conditions
                                </Button>
                            </Cluster>
                        </Stack>
                    ) : (
                        <Stack gap="default">
                            {form.conditions.length > 1 && (
                                <Select name="match" label="Match" value={form.match}
                                    options={[{ value: 'all', label: 'All of these' }, { value: 'any', label: 'Any of these' }]}
                                    onChange={(e) => patch({ match: e.target.value as 'all' | 'any' })} />
                            )}
                            {form.conditions.map((c, i) => (
                                <Cluster key={`cond-${i}`} gap="tight">
                                    <TextField name={`cond-field-${i}`} label="Field" placeholder="data.status" value={c.field}
                                        hint={i === 0 ? 'Paths: data.*, subject.type, actor.user_id' : undefined}
                                        onChange={(e) => setCondition(i, { field: e.target.value })} />
                                    <Select name={`cond-op-${i}`} label="Condition" value={c.op}
                                        options={operators.map((o) => ({ value: o, label: OPERATOR_LABEL[o] ?? o }))}
                                        onChange={(e) => setCondition(i, { op: e.target.value as ConditionOperator })} />
                                    {!NO_VALUE_OPERATORS.includes(c.op) && (
                                        <TextField name={`cond-value-${i}`} label="Value" value={c.value}
                                            hint={c.op === 'in' || c.op === 'nin' ? 'Comma-separated' : undefined}
                                            onChange={(e) => setCondition(i, { value: e.target.value })} />
                                    )}
                                    <IconButton label="Remove condition" icon={<Trash2 className="w-4 h-4" />}
                                        onClick={() => patch({ conditions: form.conditions.filter((_, j) => j !== i) })} />
                                </Cluster>
                            ))}
                            <Cluster>
                                <Button variant="secondary" size="sm"
                                    onClick={() => patch({ conditions: [...form.conditions, { field: '', op: 'eq', value: '' }] })}>
                                    <Plus className="w-4 h-4" />
                                    Add condition
                                </Button>
                            </Cluster>
                        </Stack>
                    ),
                },
                {
                    id: 'actions',
                    title: 'Then do this',
                    content: (
                        <Stack gap="default">
                            {form.actions.map((row, i) => {
                                const entry = catalog.actions.find((a) => a.key === row.type);
                                return (
                                    <Stack key={`action-${i}`} gap="tight">
                                        <Cluster gap="tight">
                                            <Select name={`action-type-${i}`} label={`Action ${i + 1}`} value={row.type}
                                                options={actionOptions} onChange={(e) => changeActionType(i, e.target.value)} />
                                            <IconButton label="Remove action" icon={<Trash2 className="w-4 h-4" />}
                                                onClick={() => patch({ actions: form.actions.filter((_, j) => j !== i) })} />
                                        </Cluster>
                                        {entry && <p className="text-sm text-fg-muted">{entry.description}</p>}
                                        {entry?.fields.map((f) => renderField(row, i, f))}
                                    </Stack>
                                );
                            })}
                            <Cluster>
                                <Button variant="secondary" size="sm"
                                    onClick={() => patch({ actions: [...form.actions, { type: '', name: '', values: {} }] })}>
                                    <Plus className="w-4 h-4" />
                                    Add action
                                </Button>
                            </Cluster>
                        </Stack>
                    ),
                },
            ]}
        />
    );
};
