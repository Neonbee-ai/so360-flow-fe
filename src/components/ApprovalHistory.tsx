import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, UserPlus, AlertCircle, Clock } from 'lucide-react';
import { Badge, Card, EmptyState, Stack } from '@so360/design-system';
import { flowApi } from '../services/flowApi';
import type { ApprovalHistory as ApprovalHistoryType, ApprovalAction } from '../types/flow';
import { useFlowFormatters } from '../utils/formatters';

interface ApprovalHistoryProps {
    entityType: string;
    entityId: string;
}

export const ApprovalHistory: React.FC<ApprovalHistoryProps> = ({ entityType, entityId }) => {
    const formatters = useFlowFormatters();
    const [history, setHistory] = useState<ApprovalHistoryType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchHistory();
    }, [entityType, entityId]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await flowApi.getApprovalHistory(entityType, entityId);
            setHistory(response.data);
        } catch (err: any) {
            setError(err.message || 'Failed to load approval history');
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (actionType: string) => {
        switch (actionType) {
            case 'APPROVE':
                return <CheckCircle className="w-5 h-5 text-success" />;
            case 'REJECT':
                return <XCircle className="w-5 h-5 text-danger" />;
            case 'DELEGATE':
                return <UserPlus className="w-5 h-5 text-primary" />;
            case 'ESCALATE':
                return <AlertCircle className="w-5 h-5 text-warning" />;
            default:
                return <Clock className="w-5 h-5 text-fg-muted" />;
        }
    };

    const getActionColor = (actionType: string) => {
        switch (actionType) {
            case 'APPROVE':
                return 'border-success/30 bg-success-container/20';
            case 'REJECT':
                return 'border-danger/30 bg-danger-container/20';
            case 'DELEGATE':
                return 'border-primary/30 bg-primary-container/20';
            case 'ESCALATE':
                return 'border-warning/30 bg-warning/20';
            default:
                return 'border-line bg-surface/30';
        }
    };

    const getStatusTone = (status: string): 'success' | 'danger' | 'info' | 'warning' | 'neutral' => {
        switch (status) {
            case 'APPROVED': return 'success';
            case 'REJECTED': return 'danger';
            case 'PENDING': return 'info';
            case 'ESCALATED': return 'warning';
            default: return 'neutral';
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="animate-pulse">
                    {[1, 2].map((i) => (
                        <div key={i} className="h-32 bg-surface/50 rounded-lg mb-4"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Card>
                <p className="text-danger text-sm">{error}</p>
            </Card>
        );
    }

    if (history.length === 0) {
        return (
            <EmptyState icon={Clock} title="No approval history for this entity" />
        );
    }

    return (
        <Stack gap="region">
            <h3 className="text-lg font-semibold text-fg">Approval History</h3>

            {history.map((instance, instanceIdx) => (
                <Card key={instance.instance_id}>
                    {/* Instance Header */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-line">
                        <div>
                            <div className="text-sm text-fg-muted mb-1">
                                Approval Request #{instanceIdx + 1}
                            </div>
                            <div className="text-xs text-fg-subtle">
                                Started: {formatters.formatDateTime(instance.requested_at)}
                            </div>
                        </div>
                        <Badge tone={getStatusTone(instance.status)} size="sm">{instance.status}</Badge>
                    </div>

                    {/* Timeline */}
                    <div className="relative space-y-4 pl-6">
                        {/* Timeline line */}
                        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-surface-raised"></div>

                        {instance.actions.map((action: ApprovalAction, actionIdx) => (
                            <div key={action.id} className="relative">
                                {/* Timeline dot */}
                                <div className="absolute -left-7 mt-1 bg-bg p-1 rounded-full">
                                    {getActionIcon(action.action_type)}
                                </div>

                                {/* Action card */}
                                <div
                                    className={`rounded-lg border p-4 ${getActionColor(
                                        action.action_type
                                    )}`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="font-medium text-fg">
                                                {action.action_type}
                                            </div>
                                            <div className="text-xs text-fg-muted mt-1">
                                                {formatters.formatDateTime(action.action_at)}
                                            </div>
                                        </div>
                                        <div className="text-xs text-fg-subtle">
                                            Step {(action as any).approval_steps?.step_order || actionIdx + 1}
                                        </div>
                                    </div>

                                    {action.comment && (
                                        <div className="mt-3 text-sm text-fg bg-bg/50 rounded p-3">
                                            "{action.comment}"
                                        </div>
                                    )}

                                    {action.delegated_to_user_id && (
                                        <div className="mt-2 text-xs text-fg-muted">
                                            Delegated to: {action.delegated_to_user_id}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Completion info */}
                    {instance.completed_at && (
                        <div className="mt-4 pt-4 border-t border-line text-xs text-fg-subtle">
                            Completed: {formatters.formatDateTime(instance.completed_at)}
                        </div>
                    )}
                </Card>
            ))}
        </Stack>
    );
};
