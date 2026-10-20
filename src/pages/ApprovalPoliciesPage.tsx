import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, Edit2, Power, FlaskConical, GripVertical, ShieldCheck } from 'lucide-react';
import { useActivity, useShellBridge } from '@so360/shell-context';
import { toast, Modal, Button, Badge, Card, Cluster, DataTable, EmptyState, IconButton, ListPageTemplate, Stack, TextField, Textarea, Select, Checkbox, Grid, GridItem, type DataTableColumn } from '@so360/design-system';
import { flowApi } from '../services/flowApi';
import { RoleSelector } from '../components/RoleSelector';

type ApproverType = 'ROLE' | 'USER' | 'DYNAMIC_FIELD' | 'DEPARTMENT_HEAD';

interface LocalApprovalStep {
    step_order: number;
    approver_type: ApproverType;
    // Shape depends on approver_type: { role_id } for ROLE, { user_id } for
    // USER, { field } for DYNAMIC_FIELD, {} for DEPARTMENT_HEAD (resolved
    // dynamically per submitter — nothing to configure on the step).
    approver_config: { role_id?: string; role_name?: string; user_id?: string; field?: string };
    sla_hours: number;
    can_delegate: boolean;
    escalation_role?: string;
}

const APPROVER_TYPE_OPTIONS: { value: ApproverType; label: string }[] = [
    { value: 'ROLE', label: 'Users with a role' },
    { value: 'USER', label: 'Specific user' },
    { value: 'DYNAMIC_FIELD', label: 'Field on the submitted record' },
    { value: 'DEPARTMENT_HEAD', label: "Submitter's department head" },
];

interface ConditionClause {
    field: string;
    operator: string;
    value: string;
    conjunction: 'AND' | 'OR';
}

interface LocalApprovalPolicy {
    id?: string;
    name: string;
    module_code: string;
    entity_type: string;
    approval_mode: 'SEQUENTIAL' | 'PARALLEL';
    steps: LocalApprovalStep[];
    conditions: ConditionClause[];
    is_active: boolean;
    priority: number;
}

const MODULE_OPTIONS = [
    { code: 'module:procurement:purchase_request', entity_type: 'purchase_request', name: 'Procurement PR' },
    { code: 'module:accounting:expense', entity_type: 'expense', name: 'Accounting Expense' },
    { code: 'module:timesheet:batch', entity_type: 'timesheet_batch', name: 'Timesheet Batch' },
    { code: 'module:crm:deal', entity_type: 'crm_deal', name: 'CRM Deal' },
    { code: 'module:projects:task', entity_type: 'task', name: 'Projects Task' },
];

const ENTITY_FIELDS: Record<string, { field: string; label: string; type: 'number' | 'text' }[]> = {
    purchase_request: [
        { field: 'total_amount', label: 'Total Amount', type: 'number' },
        { field: 'department_id', label: 'Department ID', type: 'text' },
    ],
    expense: [
        { field: 'amount', label: 'Amount', type: 'number' },
        { field: 'category', label: 'Category', type: 'text' },
    ],
    crm_deal: [
        { field: 'value', label: 'Deal Value', type: 'number' },
        { field: 'target_state', label: 'Stage', type: 'text' },
    ],
    timesheet_batch: [
        { field: 'total_hours', label: 'Total Hours', type: 'number' },
    ],
    task: [
        { field: 'estimated_hours', label: 'Estimated Hours', type: 'number' },
    ],
};

const OPERATORS = [
    { value: '>=', label: '>=' }, { value: '<=', label: '<=' },
    { value: '>', label: '>' }, { value: '<', label: '<' },
    { value: '=', label: '=' }, { value: '!=', label: '!=' },
    { value: 'CONTAINS', label: 'contains' },
];

const defaultPolicy = (): LocalApprovalPolicy => ({
    name: '', module_code: '', entity_type: '', approval_mode: 'SEQUENTIAL',
    steps: [], conditions: [], is_active: true, priority: 0,
});

const defaultStep = (order: number): LocalApprovalStep => ({
    step_order: order, approver_type: 'ROLE', approver_config: { role_id: '' },
    sla_hours: 48, can_delegate: false,
});

const defaultCondition = (entity_type: string): ConditionClause => {
    const fields = ENTITY_FIELDS[entity_type] || [];
    return { field: fields[0]?.field || 'amount', operator: '>=', value: '', conjunction: 'AND' };
};

function buildConditionExpression(conditions: ConditionClause[]): any {
    if (conditions.length === 0) return {};
    if (conditions.length === 1) {
        return { field: conditions[0].field, operator: conditions[0].operator, value: isNaN(Number(conditions[0].value)) ? conditions[0].value : Number(conditions[0].value) };
    }
    const clauses = conditions.map(c => ({ field: c.field, operator: c.operator, value: isNaN(Number(c.value)) ? c.value : Number(c.value) }));
    const conjunction = conditions[1]?.conjunction || 'AND';
    return conjunction === 'OR' ? { or: clauses } : { and: clauses };
}

export const ApprovalPoliciesPage = () => {
    const navigate = useNavigate();
    const { recordActivity } = useActivity();
    const shell = useShellBridge();
    const canAccessPolicies = (shell?.effectiveFlagsLoaded !== false) && (shell?.isFeatureEnabled?.('submodule:flow:approval_policies') ?? true);
    const canSimulate = (shell?.effectiveFlagsLoaded !== false) && (shell?.isFeatureEnabled?.('action:flow:approval:simulate') ?? true);
    const [policies, setPolicies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<LocalApprovalPolicy>(defaultPolicy());
    const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [simModal, setSimModal] = useState<{ policyId: string; result: any } | null>(null);
    const [simInput, setSimInput] = useState('{}');
    const [simLoading, setSimLoading] = useState(false);
    const dragStepIdx = useRef<number | null>(null);

    useEffect(() => { loadPolicies(); }, []);

    const loadPolicies = async () => {
        try {
            const res = await flowApi.getApprovalPolicies();
            setPolicies((res.data || []) as any[]);
        } catch { setPolicies([]); }
        finally { setLoading(false); }
    };

    const handleModuleChange = (moduleCode: string) => {
        const mod = MODULE_OPTIONS.find(m => m.code === moduleCode);
        setForm(f => ({ ...f, module_code: moduleCode, entity_type: mod?.entity_type || '', conditions: [] }));
    };

    const startEdit = (policy: any) => {
        setEditingId(policy.id);
        setForm({
            id: policy.id, name: policy.name,
            module_code: MODULE_OPTIONS.find(m => m.entity_type === policy.entity_type)?.code || '',
            entity_type: policy.entity_type, approval_mode: 'SEQUENTIAL',
            steps: [], conditions: [], is_active: policy.is_active, priority: policy.priority || 0,
        });
        setShowForm(true);
    };

    const addStep = () => setForm(f => ({ ...f, steps: [...f.steps, defaultStep(f.steps.length + 1)] }));
    const removeStep = (i: number) => setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, step_order: idx + 1 })) }));
    const updateStep = (i: number, u: Partial<LocalApprovalStep>) => setForm(f => { const s = [...f.steps]; s[i] = { ...s[i], ...u }; return { ...f, steps: s }; });

    const handleDragStart = (i: number) => { dragStepIdx.current = i; };
    const handleDragOver = (e: React.DragEvent, i: number) => {
        e.preventDefault();
        if (dragStepIdx.current === null || dragStepIdx.current === i) return;
        setForm(f => {
            const steps = [...f.steps];
            const [moved] = steps.splice(dragStepIdx.current!, 1);
            steps.splice(i, 0, moved);
            dragStepIdx.current = i;
            return { ...f, steps: steps.map((s, idx) => ({ ...s, step_order: idx + 1 })) };
        });
    };

    const addCondition = () => setForm(f => ({ ...f, conditions: [...f.conditions, defaultCondition(f.entity_type)] }));
    const removeCondition = (i: number) => setForm(f => ({ ...f, conditions: f.conditions.filter((_, idx) => idx !== i) }));
    const updateCondition = (i: number, key: string, val: any) => setForm(f => { const c = [...f.conditions]; c[i] = { ...c[i], [key]: val }; return { ...f, conditions: c }; });

    const handleSave = async () => {
        if (!form.name || !form.entity_type || form.steps.length === 0) return;
        setSaving(true);
        try {
            if (editingId) {
                await flowApi.updatePolicy(editingId, { name: form.name, priority: form.priority, is_active: form.is_active });
                recordActivity({
                    eventType: 'approval_policy.updated',
                    eventCategory: 'data',
                    description: `Updated approval policy "${form.name}"`,
                    resourceType: 'approval_policy',
                    resourceId: editingId,
                }).catch(() => {});
            } else {
                const policy = await flowApi.createApprovalPolicy({ entity_type: form.entity_type, name: form.name, priority: form.priority });
                const rule = await flowApi.createApprovalRule(policy.data.id, {
                    condition_expression: buildConditionExpression(form.conditions),
                    approval_mode: form.approval_mode,
                });
                for (const step of form.steps) {
                    await flowApi.createApprovalStep(rule.data.id, {
                        step_order: step.step_order, approver_type: step.approver_type,
                        approver_config: step.approver_config,
                        sla_hours: step.sla_hours, can_delegate: step.can_delegate,
                        escalation_role: step.escalation_role,
                    });
                }
                recordActivity({
                    eventType: 'approval_policy.created',
                    eventCategory: 'data',
                    description: `Created approval policy "${form.name}"`,
                    resourceType: 'approval_policy',
                    resourceId: policy.data.id,
                }).catch(() => {});
            }
            toast.success(editingId ? 'Policy updated' : 'Policy created');
            setShowForm(false); setEditingId(null); setForm(defaultPolicy());
            await loadPolicies();
        } catch (err) { console.error('Failed to save policy:', err); /* Error toast comes from the flowApi interceptor. */ }
        finally { setSaving(false); }
    };

    const handleToggle = async (policy: any) => {
        try { await flowApi.updatePolicy(policy.id, { is_active: !policy.is_active }); await loadPolicies(); }
        catch (err) { console.error('Failed to toggle policy:', err); }
    };

    const handleDelete = async (policyId: string) => {
        try { await flowApi.deactivatePolicy(policyId); toast.success('Policy deleted'); setConfirmDelete(null); await loadPolicies(); }
        catch (err) { console.error('Failed to delete policy:', err); /* Error toast comes from the flowApi interceptor. */ }
    };

    const handleSimulate = async (policyId: string) => {
        setSimLoading(true);
        try {
            const entityData = JSON.parse(simInput);
            const res = await flowApi.simulatePolicy(policyId, entityData);
            setSimModal({ policyId, result: res.data });
        } catch (err: any) {
            setSimModal({ policyId, result: { error: err.message } });
        } finally { setSimLoading(false); }
    };

    const trail = [{ label: 'Flows', onClick: () => navigate('/flow') }];

    if (!canAccessPolicies) {
        return (
            <ListPageTemplate title="Approval Policies" trail={trail}>
                <EmptyState
                    icon={ShieldCheck}
                    title="Not available"
                    description="This feature is not available on your current plan."
                />
            </ListPageTemplate>
        );
    }

    if (loading) return <ListPageTemplate title="Approval Policies" trail={trail} loading />;

    const entityFields = ENTITY_FIELDS[form.entity_type] || [];

    const policyColumns: DataTableColumn<any>[] = [
        {
            key: 'name',
            header: 'Policy',
            render: (policy) => (
                <Stack gap="tight">
                    <Cluster gap="tight">
                        <span className="font-medium text-fg">{policy.name}</span>
                        <Badge tone={policy.is_active ? 'success' : 'neutral'} size="sm">{policy.is_active ? 'Active' : 'Inactive'}</Badge>
                    </Cluster>
                    <span className="text-fg-muted text-xs">
                        {MODULE_OPTIONS.find(m => m.entity_type === policy.entity_type)?.name || policy.entity_type}
                        {' · '}{policy.approval_mode || 'SEQUENTIAL'}
                        {policy.steps?.length ? ` · ${policy.steps.length} step${policy.steps.length !== 1 ? 's' : ''}` : ''}
                        {' · Priority: '}{policy.priority}
                    </span>
                    {expandedPolicy === policy.id && (
                        <div className="border-t border-line pt-2">
                            <p className="text-xs text-fg-subtle mb-2">Rules &amp; Steps (expand below):</p>
                            <p className="text-fg-muted text-sm">Use the API or policy builder to view detailed rules and steps.</p>
                        </div>
                    )}
                </Stack>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (policy) => (
                <span onClick={(e) => e.stopPropagation()}>
                    <Cluster gap="tight" wrap={false}>
                        {canSimulate && (
                            <IconButton label="Test policy" icon={<FlaskConical className="w-4 h-4" />}
                                onClick={() => { setSimInput('{}'); setSimModal({ policyId: policy.id, result: null }); }} />
                        )}
                        <IconButton label="Edit policy" icon={<Edit2 className="w-4 h-4" />} onClick={() => startEdit(policy)} />
                        <IconButton label={policy.is_active ? 'Deactivate' : 'Activate'} icon={<Power className="w-4 h-4" />}
                            selected={policy.is_active} onClick={() => handleToggle(policy)} />
                        <IconButton label="Delete policy" icon={<Trash2 className="w-4 h-4" />} onClick={() => setConfirmDelete(policy.id)} />
                    </Cluster>
                </span>
            ),
        },
    ];

    return (
        <>
            {/* Confirm Delete Modal */}
            <Modal
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                size="sm"
                title="Deactivate Policy?"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                        <Button variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)}>Deactivate</Button>
                    </>
                }
            >
                <p className="text-fg-muted text-sm">This will deactivate the policy. No new approvals will be triggered by it.</p>
            </Modal>

            {/* Simulation Modal */}
            <Modal
                open={!!simModal}
                onClose={() => setSimModal(null)}
                size="lg"
                title="Policy Simulation"
                footer={
                    simModal && (
                        <>
                            <Button variant="ghost" onClick={() => setSimModal(null)}>Close</Button>
                            <Button onClick={() => handleSimulate(simModal.policyId)} disabled={simLoading}>
                                {simLoading ? 'Testing...' : 'Run Test'}
                            </Button>
                        </>
                    )
                }
            >
                {simModal && (
                    <div className="space-y-4">
                        <Textarea
                            name="sim-input"
                            label="Sample Entity Data (JSON)"
                            value={simInput}
                            onChange={e => setSimInput(e.target.value)}
                            rows={4}
                            className="font-mono"
                            placeholder='{"amount": 5000}'
                        />
                        {simModal.result && (
                            <div className={`p-3 rounded-lg text-sm ${simModal.result.matched ? 'bg-success-container/30 border border-success/30 text-success' : 'bg-danger-container/30 border border-danger/30 text-danger'}`}>
                                {simModal.result.error ? `Error: ${simModal.result.error}` :
                                    simModal.result.matched ? `✓ Policy MATCHES — ${simModal.result.steps?.length || 0} step(s) would activate` :
                                    '✗ Policy does not match this entity data'}
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            <ListPageTemplate
                title="Approval Policies"
                description="Define multi-step approval workflows"
                trail={trail}
                primaryAction={
                    <Button onClick={() => { setShowForm(true); setEditingId(null); setForm(defaultPolicy()); }}>
                        <Plus className="w-4 h-4" /> New Policy
                    </Button>
                }
            >
                <Stack gap="default">
            {/* Form */}
            {showForm && (
                <Card title={editingId ? 'Edit Policy' : 'New Approval Policy'}>
                    <Grid columns="auto" gap="md" className="mb-4">
                        <GridItem span={6}>
                            <TextField
                                name="policy-name"
                                label="Policy Name *"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="e.g., Manager Approval for Expenses"
                            />
                        </GridItem>
                        {!editingId && (
                            <GridItem span={6}>
                                <Select
                                    name="policy-module"
                                    label="Module *"
                                    value={form.module_code}
                                    onValueChange={handleModuleChange}
                                    placeholder="Select Module"
                                    options={MODULE_OPTIONS.map(m => ({ value: m.code, label: m.name }))}
                                />
                            </GridItem>
                        )}
                    </Grid>
                    <Grid columns="auto" gap="md" className="mb-4">
                        {!editingId && (
                            <GridItem span={4}>
                                <Select
                                    name="policy-mode"
                                    label="Approval Mode"
                                    value={form.approval_mode}
                                    onValueChange={v => setForm(f => ({ ...f, approval_mode: v as 'SEQUENTIAL' | 'PARALLEL' }))}
                                    options={[
                                        { value: 'SEQUENTIAL', label: 'Sequential' },
                                        { value: 'PARALLEL', label: 'Parallel' },
                                    ]}
                                />
                            </GridItem>
                        )}
                        <GridItem span={4}>
                            <TextField
                                name="policy-priority"
                                label="Priority"
                                type="number"
                                value={form.priority}
                                onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                            />
                        </GridItem>
                        <GridItem span={4} className="flex items-end">
                            <Checkbox
                                name="policy-active"
                                label="Active"
                                checked={form.is_active}
                                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                            />
                        </GridItem>
                    </Grid>

                    {!editingId && (
                        <>
                            {/* Conditions Builder */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-fg-muted">Trigger Conditions</span>
                                    <Button variant="ghost" size="sm" onClick={addCondition} disabled={!form.entity_type}>
                                        <Plus className="w-3 h-3" /> Add Condition
                                    </Button>
                                </div>
                                {form.conditions.map((cond, i) => (
                                    <div key={i} className="flex items-center gap-2 mb-2">
                                        {i > 0 && (
                                            <Select
                                                name={`cond-conj-${i}`}
                                                aria-label="Conjunction"
                                                size="sm"
                                                value={cond.conjunction}
                                                onValueChange={v => updateCondition(i, 'conjunction', v)}
                                                options={[{ value: 'AND', label: 'AND' }, { value: 'OR', label: 'OR' }]}
                                            />
                                        )}
                                        <Select
                                            name={`cond-field-${i}`}
                                            aria-label="Field"
                                            size="sm"
                                            className="flex-1"
                                            value={cond.field}
                                            onValueChange={v => updateCondition(i, 'field', v)}
                                            options={entityFields.map(f => ({ value: f.field, label: f.label }))}
                                        />
                                        <Select
                                            name={`cond-op-${i}`}
                                            aria-label="Operator"
                                            size="sm"
                                            value={cond.operator}
                                            onValueChange={v => updateCondition(i, 'operator', v)}
                                            options={OPERATORS.map(op => ({ value: op.value, label: op.label }))}
                                        />
                                        <TextField
                                            name={`cond-value-${i}`}
                                            aria-label="Value"
                                            size="sm"
                                            className="flex-1"
                                            value={cond.value}
                                            onChange={e => updateCondition(i, 'value', e.target.value)}
                                            type={entityFields.find(f => f.field === cond.field)?.type === 'number' ? 'number' : 'text'}
                                            placeholder="value"
                                        />
                                        <IconButton label="Remove condition" icon={<Trash2 className="w-4 h-4" />} onClick={() => removeCondition(i)} />
                                    </div>
                                ))}
                                {form.conditions.length === 0 && <p className="text-fg-subtle text-xs">No conditions — policy applies to all entities</p>}
                            </div>

                            {/* Steps Builder */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-fg">Approval Steps *</span>
                                    <Button variant="ghost" size="sm" onClick={addStep}><Plus className="w-3 h-3" /> Add Step</Button>
                                </div>

                                {/* Step chain visual */}
                                {form.steps.length > 0 && (
                                    <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
                                        {form.steps.map((step, i) => (
                                            <React.Fragment key={i}>
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-fg text-xs font-bold">{step.step_order}</div>
                                                {i < form.steps.length - 1 && <div className="flex-1 h-0.5 bg-line-strong min-w-4" />}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}

                                {form.steps.map((step, i) => (
                                    <div key={i} draggable onDragStart={() => handleDragStart(i)} onDragOver={e => handleDragOver(e, i)}
                                        className="bg-surface border border-line rounded-lg p-4 mb-3 cursor-move">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <GripVertical className="w-4 h-4 text-fg-subtle" />
                                                <span className="text-sm font-medium text-fg">Step {step.step_order}</span>
                                            </div>
                                            <IconButton label="Remove step" icon={<Trash2 className="w-4 h-4" />} onClick={() => removeStep(i)} />
                                        </div>
                                        <Grid columns="auto" gap="sm">
                                            <GridItem span={6}>
                                                <Select
                                                    name={`step-type-${i}`}
                                                    label="Approver Type"
                                                    size="sm"
                                                    value={step.approver_type}
                                                    onValueChange={v => updateStep(i, { approver_type: v as ApproverType, approver_config: {} })}
                                                    options={APPROVER_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                                                />
                                            </GridItem>
                                            <GridItem span={6}>
                                                <TextField
                                                    name={`step-sla-${i}`}
                                                    label="SLA (hours)"
                                                    size="sm"
                                                    type="number"
                                                    value={step.sla_hours}
                                                    onChange={e => updateStep(i, { sla_hours: parseInt(e.target.value) || 48 })}
                                                />
                                            </GridItem>
                                        </Grid>
                                        <div className="mt-3">
                                            {step.approver_type === 'ROLE' && (
                                                <div>
                                                    <span className="text-xs text-fg-subtle mb-1 block">Role</span>
                                                    <RoleSelector
                                                        value={step.approver_config.role_id || ''}
                                                        onChange={roleId => updateStep(i, { approver_config: { role_id: roleId } })}
                                                    />
                                                </div>
                                            )}
                                            {step.approver_type === 'USER' && (
                                                <div>
                                                    <TextField
                                                        name={`step-user-${i}`}
                                                        label="User ID"
                                                        size="sm"
                                                        value={step.approver_config.user_id || ''}
                                                        onChange={e => updateStep(i, { approver_config: { user_id: e.target.value } })}
                                                        placeholder="Platform user id"
                                                    />
                                                </div>
                                            )}
                                            {step.approver_type === 'DYNAMIC_FIELD' && (
                                                <div>
                                                    <TextField
                                                        name={`step-field-${i}`}
                                                        label="Field (on submitted record)"
                                                        size="sm"
                                                        value={step.approver_config.field || ''}
                                                        onChange={e => updateStep(i, { approver_config: { field: e.target.value } })}
                                                        placeholder="e.g. manager_id"
                                                    />
                                                </div>
                                            )}
                                            {step.approver_type === 'DEPARTMENT_HEAD' && (
                                                <p className="text-xs text-fg-subtle">
                                                    Resolved automatically from the submitter's department hierarchy — nothing to configure.
                                                </p>
                                            )}
                                        </div>
                                        <Grid columns="auto" gap="sm" className="mt-3">
                                            <GridItem span={6}>
                                                <span className="text-xs text-fg-subtle mb-1 block">Escalation Role (SLA breach)</span>
                                                <RoleSelector
                                                    value={step.escalation_role || ''}
                                                    onChange={roleId => updateStep(i, { escalation_role: roleId })}
                                                    placeholder="No escalation"
                                                />
                                            </GridItem>
                                            <GridItem span={6} className="flex items-end">
                                                <Checkbox
                                                    name={`step-delegate-${i}`}
                                                    label="Allow delegation"
                                                    checked={step.can_delegate}
                                                    onChange={e => updateStep(i, { can_delegate: e.target.checked })}
                                                />
                                            </GridItem>
                                        </Grid>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    <div className="flex items-center gap-3 justify-end">
                        <Button variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultPolicy()); }}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving || !form.name || (!editingId && (!form.entity_type || form.steps.length === 0))}>
                            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Policy'}
                        </Button>
                    </div>
                </Card>
            )}

            {/* Policies List */}
            <DataTable
                columns={policyColumns}
                rows={policies}
                rowKey={(policy: any) => policy.id}
                onRowClick={(policy: any) => setExpandedPolicy(expandedPolicy === policy.id ? null : policy.id)}
                emptyState={
                    <EmptyState
                        icon={ShieldCheck}
                        title="No approval policies defined"
                        description="Create your first policy to enable approval workflows"
                    />
                }
            />
                </Stack>
            </ListPageTemplate>
        </>
    );
};
