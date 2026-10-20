import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GitBranch, Database, History } from 'lucide-react';
import { toast, useConfirm, Badge, Button, Card, Cluster, DescriptionList, DetailPageTemplate, EmptyState, Stack } from '@so360/design-system';
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

    const trail = [{ label: 'Instances', onClick: () => navigate('/flow/instances') }];

    if (loading) {
        return <DetailPageTemplate trail={trail} title="Flow Instance" loading />;
    }

    if (error || !context) {
        return (
            <DetailPageTemplate trail={trail} title="Flow Instance">
                <EmptyState title={error || 'Instance not found'} />
            </DetailPageTemplate>
        );
    }

    const flowDef = context.instance.flows as unknown as FlowDefinition;
    const isCompleted = !!context.instance.completed_at;

    const details = [
        { label: 'Flow Name', value: flowDef?.name || 'N/A' },
        { label: 'Module', value: flowDef?.module_code || 'N/A' },
        { label: 'Entity Type', value: context.instance.entity_type },
        { label: 'Entity ID', value: <span className="font-mono text-xs">{context.instance.entity_id}</span> },
        { label: 'Started At', value: formatters.formatDateTime(context.instance.started_at) },
        ...(isCompleted
            ? [{ label: 'Completed At', value: formatters.formatDateTime(context.instance.completed_at!) }]
            : []),
    ];

    const rail = (
        <Stack gap="default">
            <Card title="Instance details">
                <DescriptionList items={details} />
            </Card>

            <Card title="Current state">
                <div className={`text-2xl font-bold ${getStateColor()}`}>{getCurrentStateName()}</div>
                <div className="text-xs text-fg-subtle mt-2">Code: {context.instance.current_state}</div>
            </Card>

            {!isCompleted && context.available_transitions.length > 0 && (
                <Card title="Available transitions">
                    <Cluster gap="default">
                        {context.available_transitions.map((transition) => (
                            <Button
                                key={transition.code}
                                variant="tonal"
                                onClick={() => handleTransition(transition.code, transition.name)}
                                disabled={transitioning}
                            >
                                {transition.name}
                                {transition.requires_approval && (
                                    <Badge tone="warning" size="sm">Requires Approval</Badge>
                                )}
                            </Button>
                        ))}
                    </Cluster>
                </Card>
            )}

            {isCompleted && (
                <Card>
                    <p className="text-success">
                        This flow instance has been completed. No more transitions are available.
                    </p>
                </Card>
            )}
        </Stack>
    );

    return (
        <>
            {confirmDialog}
            <DetailPageTemplate
                trail={trail}
                title="Flow Instance"
                meta={`ID: ${context.instance.id}`}
                status={isCompleted ? <Badge tone="success">Completed</Badge> : undefined}
                sidePanel={rail}
            >
                <Stack gap="default">
                    {flowDef?.states && flowDef.states.length > 0 && (
                        <Card title="State machine">
                            <FlowStateGraph
                                states={flowDef.states}
                                transitions={flowDef.transitions || []}
                                currentState={context.instance.current_state}
                                visitedStates={context.history?.map((h: any) => h.to_state) || []}
                            />
                        </Card>
                    )}

                    {context.instance.context && Object.keys(context.instance.context).length > 0 && (
                        <Card title="Instance data">
                            <pre className="text-xs text-fg bg-bg rounded-lg p-4 overflow-auto max-h-96">
                                {JSON.stringify(context.instance.context, null, 2)}
                            </pre>
                        </Card>
                    )}

                    {context.history && context.history.length > 0 && (
                        <Card title="Transition history">
                            <Stack gap="tight">
                                {context.history.map((record) => {
                                    const fromStateName = flowDef?.states?.find(
                                        (s) => s.code === record.from_state
                                    )?.name || record.from_state || 'START';
                                    const toStateName = flowDef?.states?.find(
                                        (s) => s.code === record.to_state
                                    )?.name || record.to_state;

                                    return (
                                        <div key={record.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                                            <div className="flex items-center justify-between">
                                                <Cluster gap="tight">
                                                    <span className="text-fg-muted">{fromStateName}</span>
                                                    <span className="text-fg-subtle">→</span>
                                                    <span className="text-info font-medium">{toStateName}</span>
                                                </Cluster>
                                                <span className="text-xs text-fg-subtle">
                                                    {formatters.formatDateTime(record.transitioned_at)}
                                                </span>
                                            </div>
                                            {record.comment && (
                                                <div className="text-sm text-fg-muted mt-2 italic">"{record.comment}"</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </Stack>
                        </Card>
                    )}

                    <Card>
                        <ApprovalHistory
                            entityType={context.instance.entity_type}
                            entityId={context.instance.entity_id}
                        />
                    </Card>
                </Stack>
            </DetailPageTemplate>
        </>
    );
};
