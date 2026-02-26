import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { flowApi } from '../services/flowApi';
import type { FlowDefinition } from '../types/flow';

interface SimStep {
    from_state: string;
    to_state: string;
    transition_code: string;
    transition_name: string;
    timestamp: string;
}

export const FlowSimulatorPage = () => {
    const navigate = useNavigate();
    const [flows, setFlows] = useState<FlowDefinition[]>([]);
    const [selectedFlowId, setSelectedFlowId] = useState<string>('');
    const [selectedFlow, setSelectedFlow] = useState<FlowDefinition | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentState, setCurrentState] = useState<string>('');
    const [history, setHistory] = useState<SimStep[]>([]);

    useEffect(() => {
        loadFlows();
    }, []);

    const loadFlows = async () => {
        try {
            const res = await flowApi.getFlowDefinitions();
            setFlows(res.data || []);
        } catch {
            setFlows([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectFlow = async (flowId: string) => {
        setSelectedFlowId(flowId);
        setHistory([]);
        if (!flowId) { setSelectedFlow(null); setCurrentState(''); return; }
        try {
            const res = await flowApi.getFlowDefinition(flowId);
            const flow = res.data;
            setSelectedFlow(flow);
            const initial = (flow.states || []).find((s: any) => s.is_initial);
            setCurrentState(initial?.code || '');
        } catch {
            setSelectedFlow(null);
        }
    };

    const getAvailableTransitions = () => {
        if (!selectedFlow || !currentState) return [];
        return (selectedFlow.transitions || []).filter((t: any) => t.from_state === currentState);
    };

    const getCurrentStateObj = () => {
        if (!selectedFlow || !currentState) return null;
        return (selectedFlow.states || []).find((s: any) => s.code === currentState) || null;
    };

    const applyTransition = (transition: any) => {
        const now = new Date().toLocaleTimeString();
        setHistory(prev => [...prev, {
            from_state: currentState,
            to_state: transition.to_state,
            transition_code: transition.code,
            transition_name: transition.name,
            timestamp: now,
        }]);
        setCurrentState(transition.to_state);
    };

    const resetSimulation = () => {
        if (!selectedFlow) return;
        const initial = (selectedFlow.states || []).find((s: any) => s.is_initial);
        setCurrentState(initial?.code || '');
        setHistory([]);
    };

    const stateObj = getCurrentStateObj();
    const availableTransitions = getAvailableTransitions();

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
            <div className="flex items-center gap-3 mb-8">
                <button onClick={() => navigate('/flow')} className="text-slate-400 hover:text-slate-100">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Flow Simulator</h1>
                    <p className="text-slate-400 text-sm mt-1">Walk through a flow definition step by step</p>
                </div>
            </div>

            {/* Flow Selector */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-6">
                <label className="text-sm text-slate-400 mb-2 block">Select Flow Definition</label>
                <select
                    value={selectedFlowId}
                    onChange={e => handleSelectFlow(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 px-4 py-2 rounded-lg"
                >
                    <option value="">Choose a flow to simulate...</option>
                    {flows.map((f: any) => (
                        <option key={f.id} value={f.id}>{f.name} ({f.module_code})</option>
                    ))}
                </select>
            </div>

            {selectedFlow && (
                <div className="grid grid-cols-3 gap-6">
                    {/* State Machine Visual */}
                    <div className="col-span-2 space-y-4">
                        {/* Current State */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-slate-100">Current State</h2>
                                <button
                                    onClick={resetSimulation}
                                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                                >
                                    Reset
                                </button>
                            </div>
                            {stateObj ? (
                                <div
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                                    style={{
                                        backgroundColor: (stateObj as any).color + '33',
                                        border: `2px solid ${(stateObj as any).color || '#3b82f6'}`,
                                        color: (stateObj as any).color || '#3b82f6',
                                    }}
                                >
                                    {stateObj.is_terminal ? (
                                        <CheckCircle className="w-4 h-4" />
                                    ) : stateObj.is_initial ? (
                                        <Play className="w-4 h-4" />
                                    ) : (
                                        <Clock className="w-4 h-4" />
                                    )}
                                    {stateObj.name}
                                    {stateObj.is_initial && <span className="text-xs opacity-70">(initial)</span>}
                                    {stateObj.is_terminal && <span className="text-xs opacity-70">(terminal)</span>}
                                </div>
                            ) : (
                                <p className="text-slate-500 text-sm">No current state</p>
                            )}
                        </div>

                        {/* All States Overview */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <h2 className="text-lg font-semibold text-slate-100 mb-4">State Machine</h2>
                            <div className="flex flex-wrap gap-2">
                                {(selectedFlow.states || []).map((state: any) => (
                                    <div
                                        key={state.code}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                                        style={{
                                            backgroundColor: state.code === currentState
                                                ? (state.color + '44') || '#3b82f644'
                                                : 'rgb(30 41 59 / 0.5)',
                                            border: state.code === currentState
                                                ? `2px solid ${state.color || '#3b82f6'}`
                                                : '2px solid rgb(51 65 85)',
                                            color: state.code === currentState ? (state.color || '#3b82f6') : 'rgb(148 163 184)',
                                        }}
                                    >
                                        {state.code === currentState && <div className="w-2 h-2 rounded-full bg-current animate-pulse" />}
                                        {state.name}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Available Transitions */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <h2 className="text-lg font-semibold text-slate-100 mb-4">Available Transitions</h2>
                            {stateObj?.is_terminal ? (
                                <div className="flex items-center gap-2 text-green-400 text-sm">
                                    <CheckCircle className="w-4 h-4" />
                                    Terminal state reached — simulation complete
                                </div>
                            ) : availableTransitions.length === 0 ? (
                                <div className="flex items-center gap-2 text-amber-400 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    No transitions available from this state
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {availableTransitions.map((t: any) => {
                                        const toState = (selectedFlow.states || []).find((s: any) => s.code === t.to_state);
                                        return (
                                            <button
                                                key={t.code}
                                                onClick={() => applyTransition(t)}
                                                className="w-full flex items-center justify-between bg-slate-900 border border-slate-700 hover:border-blue-500 hover:bg-slate-800 rounded-lg px-4 py-3 transition-colors text-left"
                                            >
                                                <div>
                                                    <p className="text-slate-100 text-sm font-medium">{t.name}</p>
                                                    <p className="text-slate-500 text-xs mt-0.5">code: {t.code}</p>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                                    → {toState?.name || t.to_state}
                                                    <ChevronRight className="w-4 h-4" />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* History Panel */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 h-fit">
                        <h2 className="text-lg font-semibold text-slate-100 mb-4">Transition History</h2>
                        {history.length === 0 ? (
                            <p className="text-slate-500 text-sm">No transitions yet. Click a transition to simulate.</p>
                        ) : (
                            <div className="space-y-3">
                                {history.map((step, i) => (
                                    <div key={i} className="relative pl-4 border-l-2 border-slate-700">
                                        <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-blue-500" />
                                        <p className="text-slate-300 text-sm font-medium">{step.transition_name}</p>
                                        <p className="text-slate-500 text-xs mt-0.5">
                                            {step.from_state} → {step.to_state}
                                        </p>
                                        <p className="text-slate-600 text-xs">{step.timestamp}</p>
                                    </div>
                                ))}
                                <div className="relative pl-4 border-l-2 border-dashed border-slate-700">
                                    <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-slate-600 animate-pulse" />
                                    <p className="text-slate-400 text-sm">{currentState} (current)</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!selectedFlow && !loading && (
                <div className="text-center py-16">
                    <p className="text-slate-400 text-lg mb-2">Select a flow to begin simulation</p>
                    <p className="text-slate-500 text-sm">Walk through state transitions interactively</p>
                </div>
            )}
        </div>
    );
};
