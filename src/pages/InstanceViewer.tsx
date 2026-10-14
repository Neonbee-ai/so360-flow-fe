import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, GitBranch, Database, History } from 'lucide-react';
import { toast, useConfirm } from '@so360/design-system';
import { flowApi } from '../services/flowApi';
import { ApprovalHistory } from '../components/ApprovalHistory';
import type { FlowInstance, FlowHistory, FlowDefinition } from '../types/flow';
import { FlowStateGraph } from '../components/FlowStateGraph';
import { useFlowFormatters } from '../utils/formatters';

interface InstanceContext {
    instance: FlowInstance;
    history: FlowHistory[];
    available_transitions: Array<{
        code: string;
        name: string;
        to_state: string;
        requires_approval: boolean;
    }>;
}

export const InstanceViewer = () => {
    const { instanceId } = useParams<{ instanceId: string }>();
    const navigate = useNavigate();
    const formatters = useFlowFormatters();

    const [confirm, confirmDialog] = useConfirm();
    const [context, setContext] = useState<InstanceContext | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [transitioning, setTransitioning] = useState(false);

    useEffect(() => {
        if (instanceId) {
            loadInstanceContext();
        }
    }, [instanceId]);

    const loadInstanceContext = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await flowApi.getFlowInstanceContext(instanceId!);
            setContext(response.data);
        } catch (err: any) {
            console.error('Failed to load instance:', err);
            setError(err.response?.data?.message || 'Failed to load instance');
        } finally {
            setLoading(false);
        }
    };

    const handleTransition = async (transitionCode: string, transitionName: string) => {
        if (!context) return;

        const ok = await confirm({
            title: 'Execute transition',
            message: `Execute transition "${transitionName}"?`,
            confirmLabel: 'Execute',
        });
        if (!ok) return;

        try {
            setTransitioning(true);
            await flowApi.transitionFlowInstance(instanceId!, {
                transition_code: transitionCode,
            });
            toast.success(`Transition "${transitionName}" executed`);
            // Reload instance context to see new state
            await loadInstanceContext();
        } catch (err: any) {
            console.error('Failed to execute transition:', err);
            // Error toast comes from the flowApi interceptor.
        } finally {
            setTransitioning(false);
        }
    };

    const getCurrentStateName = () => {
        if (!context) return '';
        const flowDef = context.instance.flows as unknown as FlowDefinition;
        const currentState = flowDef?.states?.find(
            (s) => s.code === context.instance.current_state
        );
        return currentState?.name || context.instance.current_state;
    };

    const getStateColor = () => {
        if (!context) return 'text-fg-muted';
        const flowDef = context.instance.flows as unknown as FlowDefinition;
        const currentState = flowDef?.states?.find(
            (s) => s.code === context.instance.current_state
        );

        if (currentState?.is_terminal) return 'text-success';
        if (currentState?.is_initial) return 'text-primary';
        return 'text-info';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-bg p-6">
                <div>
                    <div className="flex items-center justify-center py-12">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !context) {
        return (
            <div className="min-h-screen bg-bg p-6">
                <div>
                    <button
                        onClick={() => navigate('/flow/instances')}
                        className="mb-6 text-fg-muted hover:text-fg flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Instances
                    </button>
                    <div className="bg-danger-container/20 border border-danger/30 rounded-lg p-6">
                        <p className="text-danger">{error || 'Instance not found'}</p>
                    </div>
                </div>
            </div>
        );
    }

    const flowDef = context.instance.flows as unknown as FlowDefinition;
    const isCompleted = !!context.instance.completed_at;

    return (
        <div className="min-h-screen bg-bg p-6">
            {confirmDialog}
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/flow/instances')}
                        className="text-fg-muted hover:text-fg flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Instances
                    </button>
                    {isCompleted && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-success-container/30 text-success border border-success/30">
                            Completed
                        </span>
                    )}
                </div>

                {/* Instance Info */}
                <div className="bg-surface/50 border border-line rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-fg flex items-center gap-3">
                                <Activity className="w-7 h-7 text-primary" />
                                Flow Instance
                            </h1>
                            <p className="text-fg-muted text-sm mt-1">ID: {context.instance.id}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div>
                            <div className="text-xs text-fg-subtle mb-1">Flow Name</div>
                            <div className="text-fg font-medium">{flowDef?.name || 'N/A'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-fg-subtle mb-1">Module</div>
                            <div className="text-fg">{flowDef?.module_code || 'N/A'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-fg-subtle mb-1">Entity Type</div>
                            <div className="text-fg">{context.instance.entity_type}</div>
                        </div>
                        <div>
                            <div className="text-xs text-fg-subtle mb-1">Entity ID</div>
                            <div className="text-fg font-mono text-xs">
                                {context.instance.entity_id}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-fg-subtle mb-1">Started At</div>
                            <div className="text-fg text-sm">
                                {formatters.formatDateTime(context.instance.started_at)}
                            </div>
                        </div>
                        {isCompleted && (
                            <div>
                                <div className="text-xs text-fg-subtle mb-1">Completed At</div>
                                <div className="text-fg text-sm">
                                    {formatters.formatDateTime(context.instance.completed_at!)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* State Machine Visualization */}
                {flowDef?.states && flowDef.states.length > 0 && (
                    <div className="bg-surface/50 border border-line rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-fg flex items-center gap-2 mb-4">
                            <GitBranch className="w-5 h-5 text-primary" />
                            State Machine
                        </h2>
                        <FlowStateGraph
                            states={flowDef.states}
                            transitions={flowDef.transitions || []}
                            currentState={context.instance.current_state}
                            visitedStates={context.history?.map((h: any) => h.to_state) || []}
                        />
                    </div>
                )}

                {/* Current State */}
                <div className="bg-surface/50 border border-line rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-fg flex items-center gap-2 mb-4">
                        <GitBranch className="w-5 h-5 text-primary" />
                        Current State
                    </h2>
                    <div className={`text-3xl font-bold ${getStateColor()}`}>
                        {getCurrentStateName()}
                    </div>
                    <div className="text-xs text-fg-subtle mt-2">
                        Code: {context.instance.current_state}
                    </div>
                </div>

                {/* Available Transitions */}
                {!isCompleted && context.available_transitions.length > 0 && (
                    <div className="bg-surface/50 border border-line rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-fg mb-4">
                            Available Transitions
                        </h2>
                        <div className="flex flex-wrap gap-3">
                            {context.available_transitions.map((transition) => (
                                <button
                                    key={transition.code}
                                    onClick={() => handleTransition(transition.code, transition.name)}
                                    disabled={transitioning}
                                    className="px-4 py-2 bg-info hover:bg-info disabled:bg-line disabled:cursor-not-allowed text-fg rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    {transition.name}
                                    {transition.requires_approval && (
                                        <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded">
                                            Requires Approval
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {isCompleted && (
                    <div className="bg-success-container/20 border border-success/30 rounded-xl p-6 text-center">
                        <p className="text-success">
                            This flow instance has been completed. No more transitions are available.
                        </p>
                    </div>
                )}

                {/* Instance Context/Variables */}
                {context.instance.context && Object.keys(context.instance.context).length > 0 && (
                    <div className="bg-surface/50 border border-line rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-fg flex items-center gap-2 mb-4">
                            <Database className="w-5 h-5 text-primary" />
                            Instance Data
                        </h2>
                        <pre className="text-xs text-fg bg-bg rounded-lg p-4 overflow-auto max-h-96">
                            {JSON.stringify(context.instance.context, null, 2)}
                        </pre>
                    </div>
                )}

                {/* Transition History */}
                {context.history && context.history.length > 0 && (
                    <div className="bg-surface/50 border border-line rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-fg flex items-center gap-2 mb-4">
                            <History className="w-5 h-5 text-primary" />
                            Transition History
                        </h2>
                        <div className="space-y-3">
                            {context.history.map((record) => {
                                const fromStateName = flowDef?.states?.find(
                                    (s) => s.code === record.from_state
                                )?.name || record.from_state || 'START';
                                const toStateName = flowDef?.states?.find(
                                    (s) => s.code === record.to_state
                                )?.name || record.to_state;

                                return (
                                    <div
                                        key={record.id}
                                        className="bg-bg/50 border border-line rounded-lg p-4"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-fg-muted">{fromStateName}</span>
                                                <span className="text-fg-subtle">→</span>
                                                <span className="text-info font-medium">
                                                    {toStateName}
                                                </span>
                                            </div>
                                            <span className="text-xs text-fg-subtle">
                                                {formatters.formatDateTime(record.transitioned_at)}
                                            </span>
                                        </div>
                                        {record.comment && (
                                            <div className="text-sm text-fg-muted mt-2 italic">
                                                "{record.comment}"
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Approval History (if this is an approval-enabled flow) */}
                <div className="bg-surface/50 border border-line rounded-xl p-6">
                    <ApprovalHistory
                        entityType={context.instance.entity_type}
                        entityId={context.instance.entity_id}
                    />
                </div>
            </div>
        </div>
    );
};
