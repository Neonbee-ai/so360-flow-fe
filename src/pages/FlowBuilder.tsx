import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { useActivity, useShellBridge } from '@so360/shell-context';
import { toast, Select } from '@so360/design-system';
import { flowApi } from '../services/flowApi';
import type { FlowDefinition, FlowState, FlowTransition } from '../types/flow';

export const FlowBuilder = () => {
    const { flowId } = useParams<{ flowId: string }>();
    const navigate = useNavigate();
    const isNew = flowId === 'new';
    const { recordActivity } = useActivity();
    const shell = useShellBridge();
    const canAccessBuilder = (shell?.effectiveFlagsLoaded !== false) && (shell?.isFeatureEnabled?.('submodule:flow:builder') ?? true);

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [moduleCode, setModuleCode] = useState('');
    const [scope, setScope] = useState<'all_projects' | 'selective_projects'>('all_projects');
    const [states, setStates] = useState<FlowState[]>([]);
    const [transitions, setTransitions] = useState<FlowTransition[]>([]);

    const modules = [
        { code: 'module:crm:lead', name: 'CRM - Leads' },
        { code: 'module:crm:deal', name: 'CRM - Deals' },
        { code: 'module:projects:task', name: 'Projects - Tasks' },
        { code: 'module:projects:stages', name: 'Projects - Stages' },
        { code: 'module:projects:lifecycle', name: 'Projects - Lifecycle' },
        { code: 'module:procurement:purchase_request', name: 'Procurement - Purchase Requests' },
        { code: 'module:procurement:purchase_order', name: 'Procurement - Purchase Orders' },
        { code: 'module:timesheet:batch', name: 'Timesheet - Batches' },
        { code: 'module:accounting:expense', name: 'Accounting - Expenses' },
        { code: 'module:accounting:invoice', name: 'Accounting - Invoices' },
        { code: 'module:dailystore:order', name: 'Daily Store - Orders' },
        { code: 'module:fulfillment:order', name: 'Fulfillment - Orders' },
        { code: 'module:inbox:conversation', name: 'Inbox - Conversations' },
        { code: 'module:inventory:item', name: 'Inventory - Items' },
        { code: 'module:people:leave', name: 'People Connect - Leave Requests' },
        { code: 'module:support:ticket', name: 'Support - Tickets' },
    ];

    useEffect(() => {
        if (!isNew && flowId) {
            loadFlow();
        }
    }, [flowId, isNew]);

    const loadFlow = async () => {
        try {
            const response = await flowApi.getFlowDefinition(flowId!);
            const flow = response.data;
            setName(flow.name);
            setDescription(flow.description || '');
            setModuleCode(flow.module_code);
            setScope(flow.metadata?.scope || (flow.metadata?.is_default ? 'all_projects' : 'all_projects'));
            setStates(flow.states || []);
            setTransitions(flow.transitions || []);
        } catch (error) {
            console.error('Failed to load flow:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const data = {
                name,
                description,
                module_code: moduleCode,
                states,
                transitions,
                metadata: {
                    scope,
                    is_default: scope === 'all_projects',
                    applicable_to_all: scope === 'all_projects',
                },
            };

            if (isNew) {
                const created = await flowApi.createFlowDefinition(data);
                recordActivity({
                    eventType: 'flow.created',
                    eventCategory: 'system',
                    description: `Created flow "${name}"`,
                    resourceType: 'flow',
                    resourceId: created.data?.id,
                }).catch(() => {});
            } else {
                await flowApi.updateFlowDefinition(flowId!, data);
                recordActivity({
                    eventType: 'flow.updated',
                    eventCategory: 'system',
                    description: `Updated flow "${name}"`,
                    resourceType: 'flow',
                    resourceId: flowId!,
                }).catch(() => {});
            }

            toast.success(isNew ? 'Flow created' : 'Flow updated');
            navigate('/flow');
        } catch (error) {
            console.error('Failed to save flow:', error);
            // Error toast comes from the flowApi interceptor.
        } finally {
            setSaving(false);
        }
    };

    const addState = () => {
        setStates([
            ...states,
            {
                code: '',
                name: '',
                color: '#94a3b8',
                is_initial: states.length === 0,
                is_terminal: false,
            },
        ]);
    };

    const removeState = (index: number) => {
        setStates(states.filter((_, i) => i !== index));
        // Remove transitions involving this state
        const stateCode = states[index].code;
        setTransitions(
            transitions.filter((t) => t.from_state !== stateCode && t.to_state !== stateCode)
        );
    };

    const addTransition = () => {
        setTransitions([
            ...transitions,
            {
                code: '',
                name: '',
                from_state: '',
                to_state: '',
            },
        ]);
    };

    const removeTransition = (index: number) => {
        setTransitions(transitions.filter((_, i) => i !== index));
    };

    if (!canAccessBuilder) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center">
                <div className="text-center">
                    <p className="text-fg-muted font-medium">Workflow Builder</p>
                    <p className="text-sm text-fg-subtle mt-1">This feature is not available on your current plan.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-bg">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg p-6">
            <div>
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => navigate('/flow')}
                        className="flex items-center gap-2 text-fg-muted hover:text-fg"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Flows
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !name || !moduleCode || states.length === 0}
                        className="px-4 py-2 bg-primary text-primary-fg rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Save className="w-5 h-5" />
                        {saving ? 'Saving...' : 'Save Flow'}
                    </button>
                </div>

                {/* Basic Info */}
                <div className="bg-surface/50 border border-line rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold text-fg mb-4">Flow Information</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-fg-muted mb-2 block">Flow Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-surface border border-line text-fg px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-focus"
                                placeholder="e.g., Lead Approval Flow"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-fg-muted mb-2 block">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-surface border border-line text-fg px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-focus"
                                rows={3}
                                placeholder="Describe this workflow..."
                            />
                        </div>
                        <div>
                            <label className="text-sm text-fg-muted mb-2 block">Module *</label>
                            <Select
                                name="module-code"
                                value={moduleCode}
                                onChange={(e) => setModuleCode(e.target.value)}
                                options={[{ value: '', label: 'Select Module' }, ...modules.map((mod) => ({ value: mod.code, label: mod.name }))]}
                            />
                        </div>
                        {moduleCode === 'module:projects:stages' && (
                            <div className="p-4 rounded-lg bg-primary-container/40 border border-primary/50 space-y-2">
                                <label className="text-sm font-semibold text-primary block">
                                    Project Scope & Applicability
                                </label>
                                <p className="text-xs text-fg-muted leading-relaxed">
                                    Define how these stages are applied across your organization. "All Projects" sets this flow as the default stage pipeline, while "Selective Projects" lets project managers opt-in or select custom stages during project setup.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                                    <label className="flex items-center gap-2 text-sm text-fg cursor-pointer">
                                        <input
                                            type="radio"
                                            name="scope"
                                            value="all_projects"
                                            checked={scope === 'all_projects'}
                                            onChange={() => setScope('all_projects')}
                                            className="text-primary focus:ring-focus bg-surface border-line"
                                        />
                                        <span className="font-medium">All Projects in this Organization (Default)</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-fg cursor-pointer">
                                        <input
                                            type="radio"
                                            name="scope"
                                            value="selective_projects"
                                            checked={scope === 'selective_projects'}
                                            onChange={() => setScope('selective_projects')}
                                            className="text-primary focus:ring-focus bg-surface border-line"
                                        />
                                        <span>Selective Projects (Project-Level Applicability)</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* States */}
                <div className="bg-surface/50 border border-line rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-fg">States</h2>
                        <button
                            onClick={addState}
                            className="px-3 py-1 bg-surface-raised text-fg rounded hover:bg-line flex items-center gap-2 text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add State
                        </button>
                    </div>
                    <div className="space-y-3">
                        {states.map((state, index) => (
                            <div
                                key={index}
                                className="bg-surface border border-line rounded-lg p-4"
                            >
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="text-xs text-fg-subtle mb-1 block">Code *</label>
                                        <input
                                            type="text"
                                            value={state.code}
                                            onChange={(e) => {
                                                const updated = [...states];
                                                updated[index].code = e.target.value;
                                                setStates(updated);
                                            }}
                                            className="w-full bg-bg border border-line text-fg px-3 py-1.5 rounded text-sm"
                                            placeholder="e.g., draft"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-fg-subtle mb-1 block">Name *</label>
                                        <input
                                            type="text"
                                            value={state.name}
                                            onChange={(e) => {
                                                const updated = [...states];
                                                updated[index].name = e.target.value;
                                                setStates(updated);
                                            }}
                                            className="w-full bg-bg border border-line text-fg px-3 py-1.5 rounded text-sm"
                                            placeholder="e.g., Draft"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 mb-3">
                                    <label className="flex items-center gap-2 text-sm text-fg-muted">
                                        <input
                                            type="checkbox"
                                            checked={state.is_initial || false}
                                            onChange={(e) => {
                                                const updated = [...states];
                                                updated[index].is_initial = e.target.checked;
                                                setStates(updated);
                                            }}
                                            className="rounded"
                                        />
                                        Initial State
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-fg-muted">
                                        <input
                                            type="checkbox"
                                            checked={state.is_terminal || false}
                                            onChange={(e) => {
                                                const updated = [...states];
                                                updated[index].is_terminal = e.target.checked;
                                                setStates(updated);
                                            }}
                                            className="rounded"
                                        />
                                        Terminal State
                                    </label>
                                    {moduleCode === 'module:projects:stages' && (
                                        <label className="flex items-center gap-2 text-sm text-warning font-medium">
                                            <input
                                                type="checkbox"
                                                checked={state.is_mandatory || false}
                                                onChange={(e) => {
                                                    const updated = [...states];
                                                    updated[index].is_mandatory = e.target.checked;
                                                    setStates(updated);
                                                }}
                                                className="rounded text-warning focus:ring-warning"
                                            />
                                            Mandatory for All Projects
                                        </label>
                                    )}
                                    <button
                                        onClick={() => removeState(index)}
                                        className="ml-auto text-danger hover:text-danger"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Transitions */}
                <div className="bg-surface/50 border border-line rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-fg">Transitions</h2>
                        <button
                            onClick={addTransition}
                            className="px-3 py-1 bg-surface-raised text-fg rounded hover:bg-line flex items-center gap-2 text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Transition
                        </button>
                    </div>
                    <div className="space-y-3">
                        {transitions.map((transition, index) => (
                            <div
                                key={index}
                                className="bg-surface border border-line rounded-lg p-4"
                            >
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="text-xs text-fg-subtle mb-1 block">Code *</label>
                                        <input
                                            type="text"
                                            value={transition.code}
                                            onChange={(e) => {
                                                const updated = [...transitions];
                                                updated[index].code = e.target.value;
                                                setTransitions(updated);
                                            }}
                                            className="w-full bg-bg border border-line text-fg px-3 py-1.5 rounded text-sm"
                                            placeholder="e.g., submit"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-fg-subtle mb-1 block">Name *</label>
                                        <input
                                            type="text"
                                            value={transition.name}
                                            onChange={(e) => {
                                                const updated = [...transitions];
                                                updated[index].name = e.target.value;
                                                setTransitions(updated);
                                            }}
                                            className="w-full bg-bg border border-line text-fg px-3 py-1.5 rounded text-sm"
                                            placeholder="e.g., Submit for Review"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-fg-subtle mb-1 block">From State *</label>
                                        <select
                                            value={transition.from_state}
                                            onChange={(e) => {
                                                const updated = [...transitions];
                                                updated[index].from_state = e.target.value;
                                                setTransitions(updated);
                                            }}
                                            className="w-full bg-bg border border-line text-fg px-3 py-1.5 rounded text-sm"
                                        >
                                            <option value="">Select State</option>
                                            {states.map((s) => (
                                                <option key={s.code} value={s.code}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-fg-subtle mb-1 block">To State *</label>
                                        <select
                                            value={transition.to_state}
                                            onChange={(e) => {
                                                const updated = [...transitions];
                                                updated[index].to_state = e.target.value;
                                                setTransitions(updated);
                                            }}
                                            className="w-full bg-bg border border-line text-fg px-3 py-1.5 rounded text-sm"
                                        >
                                            <option value="">Select State</option>
                                            {states.map((s) => (
                                                <option key={s.code} value={s.code}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                    <label className="flex items-center gap-2 text-sm text-fg-muted cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={transition.requires_approval || false}
                                            onChange={(e) => {
                                                const updated = [...transitions];
                                                updated[index].requires_approval = e.target.checked;
                                                setTransitions(updated);
                                            }}
                                            className="w-4 h-4 rounded border-line bg-surface text-primary focus:ring-focus focus:ring-offset-slate-950"
                                        />
                                        Requires Approval
                                    </label>
                                    <button
                                        onClick={() => removeTransition(index)}
                                        className="text-danger hover:text-danger"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
