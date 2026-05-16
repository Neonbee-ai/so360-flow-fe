import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronDown, ChevronUp, ArrowLeft, Save, Edit2, Power, FlaskConical, GripVertical, X } from 'lucide-react';
import { useActivity } from '@so360/shell-context';
import { flowApi } from '../services/flowApi';
import { RoleSelector } from '../components/RoleSelector';

interface LocalApprovalStep {
    step_order: number;
    approver_type: 'ROLE';
    approver_config: { role_id: string; role_name?: string };
    sla_hours: number;
    can_delegate: boolean;
    escalation_role?: string;
}

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
                        step_order: step.step_order, approver_type: 'ROLE',
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
            setShowForm(false); setEditingId(null); setForm(defaultPolicy());
            await loadPolicies();
        } catch (err) { console.error('Failed to save policy:', err); }
        finally { setSaving(false); }
    };

    const handleToggle = async (policy: any) => {
        try { await flowApi.updatePolicy(policy.id, { is_active: !policy.is_active }); await loadPolicies(); }
        catch (err) { console.error('Failed to toggle policy:', err); }
    };

    const handleDelete = async (policyId: string) => {
        try { await flowApi.deactivatePolicy(policyId); setConfirmDelete(null); await loadPolicies(); }
        catch (err) { console.error('Failed to delete policy:', err); }
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

    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-slate-950">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent" />
        </div>
    );

    const entityFields = ENTITY_FIELDS[form.entity_type] || [];

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            {/* Confirm Delete Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold text-slate-100 mb-2">Deactivate Policy?</h3>
                        <p className="text-slate-400 text-sm mb-4">This will deactivate the policy. No new approvals will be triggered by it.</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-slate-400 hover:text-slate-100">Cancel</button>
                            <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Deactivate</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Simulation Modal */}
            {simModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-100">Policy Simulation</h3>
                            <button onClick={() => setSimModal(null)} className="text-slate-400 hover:text-slate-100"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="mb-4">
                            <label className="text-sm text-slate-400 mb-1 block">Sample Entity Data (JSON)</label>
                            <textarea
                                value={simInput}
                                onChange={e => setSimInput(e.target.value)}
                                rows={4}
                                className="w-full bg-slate-950 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg font-mono text-sm"
                                placeholder='{"amount": 5000}'
                            />
                        </div>
                        {simModal.result && (
                            <div className={`p-3 rounded-lg mb-4 text-sm ${simModal.result.matched ? 'bg-green-900/30 border border-green-500/30 text-green-300' : 'bg-red-900/30 border border-red-500/30 text-red-300'}`}>
                                {simModal.result.error ? `Error: ${simModal.result.error}` :
                                    simModal.result.matched ? `✓ Policy MATCHES — ${simModal.result.steps?.length || 0} step(s) would activate` :
                                    '✗ Policy does not match this entity data'}
                            </div>
                        )}
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setSimModal(null)} className="px-4 py-2 text-slate-400 hover:text-slate-100">Close</button>
                            <button onClick={() => handleSimulate(simModal.policyId)} disabled={simLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                {simLoading ? 'Testing...' : 'Run Test'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/flow')} className="text-slate-400 hover:text-slate-100"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Approval Policies</h1>
                        <p className="text-slate-400 text-sm mt-1">Define multi-step approval workflows</p>
                    </div>
                </div>
                <button onClick={() => { setShowForm(true); setEditingId(null); setForm(defaultPolicy()); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Plus className="w-4 h-4" /> New Policy
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-6">
                    <h2 className="text-lg font-semibold text-slate-100 mb-4">{editingId ? 'Edit Policy' : 'New Approval Policy'}</h2>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-1 block">Policy Name *</label>
                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                className="w-full bg-slate-900 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg"
                                placeholder="e.g., Manager Approval for Expenses" />
                        </div>
                        {!editingId && (
                            <div>
                                <label className="text-sm text-slate-400 mb-1 block">Module *</label>
                                <select value={form.module_code} onChange={e => handleModuleChange(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg">
                                    <option value="">Select Module</option>
                                    {MODULE_OPTIONS.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        {!editingId && (
                            <div>
                                <label className="text-sm text-slate-400 mb-1 block">Approval Mode</label>
                                <select value={form.approval_mode} onChange={e => setForm(f => ({ ...f, approval_mode: e.target.value as 'SEQUENTIAL' | 'PARALLEL' }))}
                                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg">
                                    <option value="SEQUENTIAL">Sequential</option>
                                    <option value="PARALLEL">Parallel</option>
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="text-sm text-slate-400 mb-1 block">Priority</label>
                            <input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                                className="w-full bg-slate-900 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg" />
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                                Active
                            </label>
                        </div>
                    </div>

                    {!editingId && (
                        <>
                            {/* Conditions Builder */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm text-slate-400">Trigger Conditions</label>
                                    <button onClick={addCondition} disabled={!form.entity_type}
                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:opacity-50">
                                        <Plus className="w-3 h-3" /> Add Condition
                                    </button>
                                </div>
                                {form.conditions.map((cond, i) => (
                                    <div key={i} className="flex items-center gap-2 mb-2">
                                        {i > 0 && (
                                            <select value={cond.conjunction} onChange={e => updateCondition(i, 'conjunction', e.target.value)}
                                                className="bg-slate-900 border border-slate-700 text-slate-100 px-2 py-1.5 rounded text-xs w-16">
                                                <option value="AND">AND</option>
                                                <option value="OR">OR</option>
                                            </select>
                                        )}
                                        <select value={cond.field} onChange={e => updateCondition(i, 'field', e.target.value)}
                                            className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 px-3 py-1.5 rounded text-sm">
                                            {entityFields.map(f => <option key={f.field} value={f.field}>{f.label}</option>)}
                                        </select>
                                        <select value={cond.operator} onChange={e => updateCondition(i, 'operator', e.target.value)}
                                            className="bg-slate-900 border border-slate-700 text-slate-100 px-2 py-1.5 rounded text-sm w-20">
                                            {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                                        </select>
                                        <input value={cond.value} onChange={e => updateCondition(i, 'value', e.target.value)}
                                            type={entityFields.find(f => f.field === cond.field)?.type === 'number' ? 'number' : 'text'}
                                            className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 px-3 py-1.5 rounded text-sm"
                                            placeholder="value" />
                                        <button onClick={() => removeCondition(i)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                {form.conditions.length === 0 && <p className="text-slate-500 text-xs">No conditions — policy applies to all entities</p>}
                            </div>

                            {/* Steps Builder */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-slate-300">Approval Steps *</label>
                                    <button onClick={addStep} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Step</button>
                                </div>

                                {/* Step chain visual */}
                                {form.steps.length > 0 && (
                                    <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
                                        {form.steps.map((step, i) => (
                                            <React.Fragment key={i}>
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">{step.step_order}</div>
                                                {i < form.steps.length - 1 && <div className="flex-1 h-0.5 bg-slate-600 min-w-4" />}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}

                                {form.steps.map((step, i) => (
                                    <div key={i} draggable onDragStart={() => handleDragStart(i)} onDragOver={e => handleDragOver(e, i)}
                                        className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-3 cursor-move">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <GripVertical className="w-4 h-4 text-slate-500" />
                                                <span className="text-sm font-medium text-slate-300">Step {step.step_order}</span>
                                            </div>
                                            <button onClick={() => removeStep(i)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-slate-500 mb-1 block">Approver Role</label>
                                                <RoleSelector
                                                    value={step.approver_config.role_id}
                                                    onChange={roleId => updateStep(i, { approver_config: { role_id: roleId } })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 mb-1 block">SLA (hours)</label>
                                                <input type="number" value={step.sla_hours}
                                                    onChange={e => updateStep(i, { sla_hours: parseInt(e.target.value) || 48 })}
                                                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 px-3 py-1.5 rounded text-sm" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mt-3">
                                            <div>
                                                <label className="text-xs text-slate-500 mb-1 block">Escalation Role (SLA breach)</label>
                                                <RoleSelector
                                                    value={step.escalation_role || ''}
                                                    onChange={roleId => updateStep(i, { escalation_role: roleId })}
                                                    placeholder="No escalation"
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                                                    <input type="checkbox" checked={step.can_delegate}
                                                        onChange={e => updateStep(i, { can_delegate: e.target.checked })} className="rounded" />
                                                    Allow delegation
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    <div className="flex items-center gap-3 justify-end">
                        <button onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultPolicy()); }} className="px-4 py-2 text-slate-400 hover:text-slate-100">Cancel</button>
                        <button onClick={handleSave} disabled={saving || !form.name || (!editingId && (!form.entity_type || form.steps.length === 0))}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Policy'}
                        </button>
                    </div>
                </div>
            )}

            {/* Policies List */}
            {policies.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-slate-400 text-lg mb-2">No approval policies defined</p>
                    <p className="text-slate-500 text-sm">Create your first policy to enable approval workflows</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {policies.map((policy: any) => (
                        <div key={policy.id} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3 cursor-pointer flex-1"
                                    onClick={() => setExpandedPolicy(expandedPolicy === policy.id ? null : policy.id)}>
                                    <div className={`w-2 h-2 rounded-full ${policy.is_active ? 'bg-green-400' : 'bg-slate-500'}`} />
                                    <div>
                                        <p className="text-slate-100 font-medium">{policy.name}</p>
                                        <p className="text-slate-400 text-xs mt-0.5">
                                            {MODULE_OPTIONS.find(m => m.entity_type === policy.entity_type)?.name || policy.entity_type}
                                            {' · '}{policy.approval_mode || 'SEQUENTIAL'}
                                            {policy.steps?.length ? ` · ${policy.steps.length} step${policy.steps.length !== 1 ? 's' : ''}` : ''}
                                            {' · Priority: '}{policy.priority}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { setSimInput('{}'); setSimModal({ policyId: policy.id, result: null }); }}
                                        title="Test policy" className="p-1.5 text-slate-400 hover:text-blue-400">
                                        <FlaskConical className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => startEdit(policy)} title="Edit policy" className="p-1.5 text-slate-400 hover:text-slate-100">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleToggle(policy)} title={policy.is_active ? 'Deactivate' : 'Activate'}
                                        className={`p-1.5 ${policy.is_active ? 'text-green-400 hover:text-green-300' : 'text-slate-500 hover:text-slate-300'}`}>
                                        <Power className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setConfirmDelete(policy.id)} title="Delete policy" className="p-1.5 text-red-400 hover:text-red-300">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    {expandedPolicy === policy.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                </div>
                            </div>
                            {expandedPolicy === policy.id && (
                                <div className="border-t border-slate-800 p-4">
                                    <p className="text-xs text-slate-500 mb-2">Rules &amp; Steps (expand below):</p>
                                    <p className="text-slate-400 text-sm">Use the API or policy builder to view detailed rules and steps.</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
