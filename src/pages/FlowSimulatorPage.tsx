import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Button, IconButton, Grid, GridItem } from '@so360/design-system';
import { ArrowLeft, Play, ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { flowApi } from '../services/flowApi';
import type { FlowDefinition } from '../types/flow';
import { useFlowFormatters } from '../utils/formatters';

interface SimStep {
    from_state: string;
    to_state: string;
    transition_code: string;
    transition_name: string;
    timestamp: string;
}

export const FlowSimulatorPage = () => {
    const navigate = useNavigate();
    const formatters = useFlowFormatters();
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
        const now = formatters.formatDate(new Date().toISOString(), { hour: '2-digit', minute: '2-digit' });
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
            <div className="flex items-center justify-center h-screen bg-bg">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <IconButton label="Back" icon={<ArrowLeft className="w-5 h-5" />} onClick={() => navigate('/flow')} />
                <div>
                    <h1 className="text-2xl font-bold text-fg">Flow Simulator</h1>
                    <p className="text-fg-muted text-sm mt-1">Walk through a flow definition step by step</p>
                </div>
            </div>

            {/* Flow Selector */}
            <div className="bg-surface/50 border border-line rounded-xl p-5 mb-6">
                <Select
                    label="Select Flow Definition"
                    name="flow-definition"
                    value={selectedFlowId}
                    onChange={e => handleSelectFlow(e.target.value)}
                    options={[{ value: '', label: 'Choose a flow to simulate...' }, ...flows.map((f: any) => ({ value: f.id, label: `${f.name} (${f.module_code})` }))]}
                />
            </div>

            {selectedFlow && (
                <Grid columns="auto" gap="lg">
                    {/* State Machine Visual */}
                    <GridItem span={8} className="space-y-4">
                        {/* Current State */}
                        <div className="bg-surface/50 border border-line rounded-xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-fg">Current State</h2>
                                <Button variant="ghost" size="sm" onClick={resetSimulation}>
                                    Reset
                                </Button>
                            </div>
                            {stateObj ? (
                                <div
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                                    style={{
                                        backgroundColor: (stateObj as any).color + '33',
                                        border: `2px solid ${(stateObj as any).color || 'rgb(var(--nb-primary))'}`,
                                        color: (stateObj as any).color || 'rgb(var(--nb-primary))',
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
                                <p className="text-fg-subtle text-sm">No current state</p>
                            )}
                        </div>

                        {/* All States Overview */}
                        <div className="bg-surface/50 border border-line rounded-xl p-5">
                            <h2 className="text-lg font-semibold text-fg mb-4">State Machine</h2>
                            <div className="flex flex-wrap gap-2">
                                {(selectedFlow.states || []).map((state: any) => (
                                    <div
                                        key={state.code}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                                        style={{
                                            backgroundColor: state.code === currentState
                                                ? (state.color ? state.color + '44' : 'rgb(var(--nb-primary) / 0.27)')
                                                : 'rgb(var(--nb-surface) / 0.5)',
                                            border: state.code === currentState
                                                ? `2px solid ${state.color || 'rgb(var(--nb-primary))'}`
                                                : '2px solid rgb(var(--nb-border))',
                                            color: state.code === currentState ? (state.color || 'rgb(var(--nb-primary))') : 'rgb(var(--nb-fg-muted))',
                                        }}
                                    >
                                        {state.code === currentState && <div className="w-2 h-2 rounded-full bg-current animate-pulse" />}
                                        {state.name}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Available Transitions */}
                        <div className="bg-surface/50 border border-line rounded-xl p-5">
                            <h2 className="text-lg font-semibold text-fg mb-4">Available Transitions</h2>
                            {stateObj?.is_terminal ? (
                                <div className="flex items-center gap-2 text-success text-sm">
                                    <CheckCircle className="w-4 h-4" />
                                    Terminal state reached — simulation complete
                                </div>
                            ) : availableTransitions.length === 0 ? (
                                <div className="flex items-center gap-2 text-warning text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    No transitions available from this state
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {availableTransitions.map((t: any) => {
                                        const toState = (selectedFlow.states || []).find((s: any) => s.code === t.to_state);
                                        return (
                                            <Button
                                                key={t.code}
                                                variant="secondary"
                                                onClick={() => applyTransition(t)}
                                                className="w-full !h-auto justify-between py-nb-3 text-left"
                                            >
                                                <div>
                                                    <p className="text-fg text-sm font-medium">{t.name}</p>
                                                    <p className="text-fg-subtle text-xs mt-0.5">code: {t.code}</p>
                                                </div>
                                                <div className="flex items-center gap-2 text-fg-muted text-sm">
                                                    → {toState?.name || t.to_state}
                                                    <ChevronRight className="w-4 h-4" />
                                                </div>
                                            </Button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </GridItem>

                    {/* History Panel */}
                    <GridItem span={4} className="bg-surface/50 border border-line rounded-xl p-5 h-fit">
                        <h2 className="text-lg font-semibold text-fg mb-4">Transition History</h2>
                        {history.length === 0 ? (
                            <p className="text-fg-subtle text-sm">No transitions yet. Click a transition to simulate.</p>
                        ) : (
                            <div className="space-y-3">
                                {history.map((step, i) => (
                                    <div key={i} className="relative pl-4 border-l-2 border-line">
                                        <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-primary" />
                                        <p className="text-fg text-sm font-medium">{step.transition_name}</p>
                                        <p className="text-fg-subtle text-xs mt-0.5">
                                            {step.from_state} → {step.to_state}
                                        </p>
                                        <p className="text-fg-subtle text-xs">{step.timestamp}</p>
                                    </div>
                                ))}
                                <div className="relative pl-4 border-l-2 border-dashed border-line">
                                    <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-line-strong animate-pulse" />
                                    <p className="text-fg-muted text-sm">{currentState} (current)</p>
                                </div>
                            </div>
                        )}
                    </GridItem>
                </Grid>
            )}

            {!selectedFlow && !loading && (
                <div className="text-center py-16">
                    <p className="text-fg-muted text-lg mb-2">Select a flow to begin simulation</p>
                    <p className="text-fg-subtle text-sm">Walk through state transitions interactively</p>
                </div>
            )}
        </div>
    );
};
