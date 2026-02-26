import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronDown, ChevronUp, ArrowLeft, Save } from 'lucide-react';
import { flowApi } from '../services/flowApi';

interface ApprovalStep {
    step_order: number;
    approver_type: 'ROLE' | 'USER' | 'DYNAMIC';
    approver_config: Record<string, any>;
    sla_hours: number;
    can_delegate: boolean;
}

interface ApprovalPolicy {
    id?: string;
    name: string;
    module_code: string;
    entity_type: string;
    approval_mode: 'SEQUENTIAL' | 'PARALLEL';
    steps: ApprovalStep[];
    conditions: Array<{ field: string; operator: string; value: any }>;
    is_active: boolean;
}

const MODULE_OPTIONS = [
    { code: 'module:procurement:purchase_request', entity_type: 'purchase_request', name: 'Procurement PR' },
    { code: 'module:accounting:expense', entity_type: 'expense', name: 'Accounting Expense' },
    { code: 'module:timesheet:batch', entity_type: 'timesheet_batch', name: 'Timesheet Batch' },
    { code: 'module:crm:deal', entity_type: 'crm_deal', name: 'CRM Deal' },
    { code: 'module:projects:task', entity_type: 'task', name: 'Projects Task' },
];

const CONDITION_OPERATORS = ['equals', 'not_equals', 'greater_than', 'less_than', 'contains'];

const defaultPolicy = (): ApprovalPolicy => ({
    name: '',
    module_code: '',
    entity_type: '',
    approval_mode: 'SEQUENTIAL',
    steps: [],
    conditions: [],
    is_active: true,
});

const defaultStep = (order: number): ApprovalStep => ({
    step_order: order,
    approver_type: 'ROLE',
    approver_config: {},
    sla_hours: 48,
    can_delegate: false,
});

export const ApprovalPoliciesPage = () => {
    const navigate = useNavigate();
    const [policies, setPolicies] = useState<ApprovalPolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<ApprovalPolicy>(defaultPolicy());
    const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);

    useEffect(() => {
        loadPolicies();
    }, []);

    const loadPolicies = async () => {
        try {
            const res = await flowApi.getApprovalPolicies();
            setPolicies(res.data || []);
        } catch {
            setPolicies([]);
        } finally {
            setLoading(false);
        }
    };

    const handleModuleChange = (moduleCode: string) => {
        const mod = MODULE_OPTIONS.find(m => m.code === moduleCode);
        setForm(f => ({ ...f, module_code: moduleCode, entity_type: mod?.entity_type || '' }));
    };

    const addStep = () => {
        setForm(f => ({
            ...f,
            steps: [...f.steps, defaultStep(f.steps.length + 1)],
        }));
    };

    const removeStep = (index: number) => {
        setForm(f => ({
            ...f,
            steps: f.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i + 1 })),
        }));
    };

    const updateStep = (index: number, updates: Partial<ApprovalStep>) => {
        setForm(f => {
            const steps = [...f.steps];
            steps[index] = { ...steps[index], ...updates };
            return { ...f, steps };
        });
    };

    const addCondition = () => {
        setForm(f => ({
            ...f,
            conditions: [...f.conditions, { field: 'amount', operator: 'greater_than', value: '' }],
        }));
    };

    const removeCondition = (index: number) => {
        setForm(f => ({ ...f, conditions: f.conditions.filter((_, i) => i !== index) }));
    };

    const updateCondition = (index: number, key: string, value: any) => {
        setForm(f => {
            const conditions = [...f.conditions];
            conditions[index] = { ...conditions[index], [key]: value };
            return { ...f, conditions };
        });
    };

    const handleSave = async () => {
        if (!form.name || !form.module_code || form.steps.length === 0) return;
        try {
            setSaving(true);
            await flowApi.createApprovalPolicy(form);
            setShowForm(false);
            setForm(defaultPolicy());
            await loadPolicies();
        } catch (err) {
            console.error('Failed to save policy:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/flow')} className="text-slate-400 hover:text-slate-100">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Approval Policies</h1>
                        <p className="text-slate-400 text-sm mt-1">Define multi-step approval workflows for each module</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4" />
                    New Policy
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-6">
                    <h2 className="text-lg font-semibold text-slate-100 mb-4">New Approval Policy</h2>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-1 block">Policy Name *</label>
                            <input
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                className="w-full bg-slate-900 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg"
                                placeholder="e.g., Manager Approval for Expenses > $500"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-1 block">Module *</label>
                            <select
                                value={form.module_code}
                                onChange={e => handleModuleChange(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg"
                            >
                                <option value="">Select Module</option>
                                {MODULE_OPTIONS.map(m => (
                                    <option key={m.code} value={m.code}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-1 block">Approval Mode</label>
                            <select
                                value={form.approval_mode}
                                onChange={e => setForm(f => ({ ...f, approval_mode: e.target.value as 'SEQUENTIAL' | 'PARALLEL' }))}
                                className="w-full bg-slate-900 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg"
                            >
                                <option value="SEQUENTIAL">Sequential (one at a time)</option>
                                <option value="PARALLEL">Parallel (all at once)</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                    className="rounded"
                                />
                                Active Policy
                            </label>
                        </div>
                    </div>

                    {/* Conditions */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm text-slate-400">Trigger Conditions</label>
                            <button onClick={addCondition} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Add Condition
                            </button>
                        </div>
                        {form.conditions.map((cond, i) => (
                            <div key={i} className="flex items-center gap-2 mb-2">
                                <input
                                    value={cond.field}
                                    onChange={e => updateCondition(i, 'field', e.target.value)}
                                    className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 px-3 py-1.5 rounded text-sm"
                                    placeholder="field (e.g., amount)"
                                />
                                <select
                                    value={cond.operator}
                                    onChange={e => updateCondition(i, 'operator', e.target.value)}
                                    className="bg-slate-900 border border-slate-700 text-slate-100 px-3 py-1.5 rounded text-sm"
                                >
                                    {CONDITION_OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                                </select>
                                <input
                                    value={cond.value}
                                    onChange={e => updateCondition(i, 'value', e.target.value)}
                                    className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 px-3 py-1.5 rounded text-sm"
                                    placeholder="value"
                                />
                                <button onClick={() => removeCondition(i)} className="text-red-400 hover:text-red-300">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {form.conditions.length === 0 && (
                            <p className="text-slate-500 text-xs">No conditions — policy applies to all entities</p>
                        )}
                    </div>

                    {/* Steps */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-slate-300">Approval Steps *</label>
                            <button onClick={addStep} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Add Step
                            </button>
                        </div>
                        {form.steps.map((step, i) => (
                            <div key={i} className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-3">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-slate-300">Step {step.step_order}</span>
                                    <button onClick={() => removeStep(i)} className="text-red-400 hover:text-red-300">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">Approver Type</label>
                                        <select
                                            value={step.approver_type}
                                            onChange={e => updateStep(i, { approver_type: e.target.value as ApprovalStep['approver_type'] })}
                                            className="w-full bg-slate-950 border border-slate-700 text-slate-100 px-3 py-1.5 rounded text-sm"
                                        >
                                            <option value="ROLE">Role</option>
                                            <option value="USER">Specific User</option>
                                            <option value="DYNAMIC">Dynamic</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">SLA (hours)</label>
                                        <input
                                            type="number"
                                            value={step.sla_hours}
                                            onChange={e => updateStep(i, { sla_hours: parseInt(e.target.value) || 48 })}
                                            className="w-full bg-slate-950 border border-slate-700 text-slate-100 px-3 py-1.5 rounded text-sm"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={step.can_delegate}
                                                onChange={e => updateStep(i, { can_delegate: e.target.checked })}
                                                className="rounded"
                                            />
                                            Can Delegate
                                        </label>
                                    </div>
                                </div>
                                {step.approver_type === 'ROLE' && (
                                    <div className="mt-3">
                                        <label className="text-xs text-slate-500 mb-1 block">Role Name</label>
                                        <input
                                            value={step.approver_config?.role_name || ''}
                                            onChange={e => updateStep(i, { approver_config: { ...step.approver_config, role_name: e.target.value } })}
                                            className="w-full bg-slate-950 border border-slate-700 text-slate-100 px-3 py-1.5 rounded text-sm"
                                            placeholder="e.g., finance_manager"
                                        />
                                    </div>
                                )}
                                {step.approver_type === 'USER' && (
                                    <div className="mt-3">
                                        <label className="text-xs text-slate-500 mb-1 block">User ID</label>
                                        <input
                                            value={step.approver_config?.user_id || ''}
                                            onChange={e => updateStep(i, { approver_config: { ...step.approver_config, user_id: e.target.value } })}
                                            className="w-full bg-slate-950 border border-slate-700 text-slate-100 px-3 py-1.5 rounded text-sm"
                                            placeholder="UUID of specific user"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 justify-end">
                        <button onClick={() => { setShowForm(false); setForm(defaultPolicy()); }} className="px-4 py-2 text-slate-400 hover:text-slate-100">
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || !form.name || !form.module_code || form.steps.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Policy'}
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
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-900/80"
                                onClick={() => setExpandedPolicy(expandedPolicy === policy.id ? null : policy.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${policy.is_active ? 'bg-green-400' : 'bg-slate-500'}`} />
                                    <div>
                                        <p className="text-slate-100 font-medium">{policy.name}</p>
                                        <p className="text-slate-400 text-xs mt-0.5">
                                            {MODULE_OPTIONS.find(m => m.code === policy.module_code)?.name || policy.module_code}
                                            {' · '}
                                            {policy.approval_mode}
                                            {' · '}
                                            {(policy.steps || []).length} step(s)
                                        </p>
                                    </div>
                                </div>
                                {expandedPolicy === policy.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                            {expandedPolicy === policy.id && (
                                <div className="border-t border-slate-800 p-4">
                                    <div className="space-y-2">
                                        {(policy.steps || []).map((step: ApprovalStep) => (
                                            <div key={step.step_order} className="flex items-center gap-4 bg-slate-900 rounded-lg p-3">
                                                <span className="text-slate-500 text-xs w-14">Step {step.step_order}</span>
                                                <span className="text-slate-300 text-sm flex-1">
                                                    {step.approver_type === 'ROLE' && `Role: ${step.approver_config?.role_name || '—'}`}
                                                    {step.approver_type === 'USER' && `User: ${step.approver_config?.user_id || '—'}`}
                                                    {step.approver_type === 'DYNAMIC' && 'Dynamic approver'}
                                                </span>
                                                <span className="text-slate-500 text-xs">SLA: {step.sla_hours}h</span>
                                                {step.can_delegate && <span className="text-xs text-blue-400">Delegatable</span>}
                                            </div>
                                        ))}
                                    </div>
                                    {(policy.conditions || []).length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-800">
                                            <p className="text-xs text-slate-500 mb-2">Conditions:</p>
                                            {policy.conditions.map((cond: any, i: number) => (
                                                <span key={i} className="inline-block bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded mr-2">
                                                    {cond.field} {cond.operator} {cond.value}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
