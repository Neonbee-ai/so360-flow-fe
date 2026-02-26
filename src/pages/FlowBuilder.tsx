import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { flowApi } from '../services/flowApi';
import type { FlowDefinition, FlowState, FlowTransition } from '../types/flow';

export const FlowBuilder = () => {
    const { flowId } = useParams<{ flowId: string }>();
    const navigate = useNavigate();
    const isNew = flowId === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [moduleCode, setModuleCode] = useState('');
    const [states, setStates] = useState<FlowState[]>([]);
    const [transitions, setTransitions] = useState<FlowTransition[]>([]);

    const modules = [
        { code: 'module:crm:lead', name: 'CRM - Leads' },
        { code: 'module:crm:deal', name: 'CRM - Deals' },
        { code: 'module:projects:task', name: 'Projects - Tasks' },
        { code: 'module:projects:lifecycle', name: 'Projects - Lifecycle' },
        { code: 'module:procurement:purchase_request', name: 'Procurement - Purchase Requests' },
        { code: 'module:procurement:purchase_order', name: 'Procurement - Purchase Orders' },
        { code: 'module:timesheet:batch', name: 'Timesheet - Batches' },
        { code: 'module:accounting:expense', name: 'Accounting - Expenses' },
        { code: 'module:accounting:invoice', name: 'Accounting - Invoices' },
        { code: 'module:dailystore:order', name: 'Daily Store - Orders' },
        { code: 'module:fulfillment:order', name: 'Fulfillment - Orders' },
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
            };

            if (isNew) {
                await flowApi.createFlowDefinition(data);
            } else {
                await flowApi.updateFlowDefinition(flowId!, data);
            }

            navigate('/flow');
        } catch (error) {
            console.error('Failed to save flow:', error);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div>
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => navigate('/flow')}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-100"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Flows
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !name || !moduleCode || states.length === 0}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Save className="w-5 h-5" />
                        {saving ? 'Saving...' : 'Save Flow'}
                    </button>
                </div>

                {/* Basic Info */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold text-slate-100 mb-4">Flow Information</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Flow Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 text-slate-100 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Lead Approval Flow"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 text-slate-100 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="Describe this workflow..."
                            />
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Module *</label>
                            <select
                                value={moduleCode}
                                onChange={(e) => setModuleCode(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 text-slate-100 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Module</option>
                                {modules.map((mod) => (
                                    <option key={mod.code} value={mod.code}>
                                        {mod.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* States */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-slate-100">States</h2>
                        <button
                            onClick={addState}
                            className="px-3 py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 flex items-center gap-2 text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add State
                        </button>
                    </div>
                    <div className="space-y-3">
                        {states.map((state, index) => (
                            <div
                                key={index}
                                className="bg-slate-900 border border-slate-800 rounded-lg p-4"
                            >
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">Code *</label>
                                        <input
                                            type="text"
                                            value={state.code}
                                            onChange={(e) => {
                                                const updated = [...states];
                                                updated[index].code = e.target.value;
                                                setStates(updated);
                                            }}
                                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-1.5 rounded text-sm"
                                            placeholder="e.g., draft"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">Name *</label>
                                        <input
                                            type="text"
                                            value={state.name}
                                            onChange={(e) => {
                                                const updated = [...states];
                                                updated[index].name = e.target.value;
                                                setStates(updated);
                                            }}
                                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-1.5 rounded text-sm"
                                            placeholder="e.g., Draft"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 mb-3">
                                    <label className="flex items-center gap-2 text-sm text-slate-400">
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
                                    <label className="flex items-center gap-2 text-sm text-slate-400">
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
                                    <button
                                        onClick={() => removeState(index)}
                                        className="ml-auto text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Transitions */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-slate-100">Transitions</h2>
                        <button
                            onClick={addTransition}
                            className="px-3 py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 flex items-center gap-2 text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Transition
                        </button>
                    </div>
                    <div className="space-y-3">
                        {transitions.map((transition, index) => (
                            <div
                                key={index}
                                className="bg-slate-900 border border-slate-800 rounded-lg p-4"
                            >
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">Code *</label>
                                        <input
                                            type="text"
                                            value={transition.code}
                                            onChange={(e) => {
                                                const updated = [...transitions];
                                                updated[index].code = e.target.value;
                                                setTransitions(updated);
                                            }}
                                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-1.5 rounded text-sm"
                                            placeholder="e.g., submit"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">Name *</label>
                                        <input
                                            type="text"
                                            value={transition.name}
                                            onChange={(e) => {
                                                const updated = [...transitions];
                                                updated[index].name = e.target.value;
                                                setTransitions(updated);
                                            }}
                                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-1.5 rounded text-sm"
                                            placeholder="e.g., Submit for Review"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">From State *</label>
                                        <select
                                            value={transition.from_state}
                                            onChange={(e) => {
                                                const updated = [...transitions];
                                                updated[index].from_state = e.target.value;
                                                setTransitions(updated);
                                            }}
                                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-1.5 rounded text-sm"
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
                                        <label className="text-xs text-slate-500 mb-1 block">To State *</label>
                                        <select
                                            value={transition.to_state}
                                            onChange={(e) => {
                                                const updated = [...transitions];
                                                updated[index].to_state = e.target.value;
                                                setTransitions(updated);
                                            }}
                                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-1.5 rounded text-sm"
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
                                    <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={transition.requires_approval || false}
                                            onChange={(e) => {
                                                const updated = [...transitions];
                                                updated[index].requires_approval = e.target.checked;
                                                setTransitions(updated);
                                            }}
                                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-950"
                                        />
                                        Requires Approval
                                    </label>
                                    <button
                                        onClick={() => removeTransition(index)}
                                        className="text-red-400 hover:text-red-300"
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
