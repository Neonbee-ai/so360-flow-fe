import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, UserPlus, AlertCircle, Clock } from 'lucide-react';
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
                return <CheckCircle className="w-5 h-5 text-green-400" />;
            case 'REJECT':
                return <XCircle className="w-5 h-5 text-red-400" />;
            case 'DELEGATE':
                return <UserPlus className="w-5 h-5 text-blue-400" />;
            case 'ESCALATE':
                return <AlertCircle className="w-5 h-5 text-amber-400" />;
            default:
                return <Clock className="w-5 h-5 text-slate-400" />;
        }
    };

    const getActionColor = (actionType: string) => {
        switch (actionType) {
            case 'APPROVE':
                return 'border-green-500/30 bg-green-900/20';
            case 'REJECT':
                return 'border-red-500/30 bg-red-900/20';
            case 'DELEGATE':
                return 'border-blue-500/30 bg-blue-900/20';
            case 'ESCALATE':
                return 'border-amber-500/30 bg-amber-900/20';
            default:
                return 'border-slate-700 bg-slate-900/30';
        }
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return 'bg-green-900/30 text-green-400 border-green-500/30';
            case 'REJECTED':
                return 'bg-red-900/30 text-red-400 border-red-500/30';
            case 'PENDING':
                return 'bg-blue-900/30 text-blue-400 border-blue-500/30';
            case 'ESCALATED':
                return 'bg-amber-900/30 text-amber-400 border-amber-500/30';
            default:
                return 'bg-slate-800 text-slate-400 border-slate-700';
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="animate-pulse">
                    {[1, 2].map((i) => (
                        <div key={i} className="h-32 bg-slate-900/50 rounded-lg mb-4"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="text-center py-8 bg-slate-900/30 rounded-lg border border-slate-800">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No approval history for this entity</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-100">Approval History</h3>

            {history.map((instance, instanceIdx) => (
                <div
                    key={instance.instance_id}
                    className="bg-slate-900/50 rounded-lg border border-slate-800 p-6"
                >
                    {/* Instance Header */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
                        <div>
                            <div className="text-sm text-slate-400 mb-1">
                                Approval Request #{instanceIdx + 1}
                            </div>
                            <div className="text-xs text-slate-500">
                                Started: {formatters.formatDateTime(instance.requested_at)}
                            </div>
                        </div>
                        <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                                instance.status
                            )}`}
                        >
                            {instance.status}
                        </span>
                    </div>

                    {/* Timeline */}
                    <div className="relative space-y-4 pl-6">
                        {/* Timeline line */}
                        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-800"></div>

                        {instance.actions.map((action: ApprovalAction, actionIdx) => (
                            <div key={action.id} className="relative">
                                {/* Timeline dot */}
                                <div className="absolute -left-[26px] mt-1 bg-slate-950 p-1 rounded-full">
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
                                            <div className="font-medium text-slate-100">
                                                {action.action_type}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">
                                                {formatters.formatDateTime(action.action_at)}
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Step {(action as any).approval_steps?.step_order || actionIdx + 1}
                                        </div>
                                    </div>

                                    {action.comment && (
                                        <div className="mt-3 text-sm text-slate-300 bg-slate-950/50 rounded p-3">
                                            "{action.comment}"
                                        </div>
                                    )}

                                    {action.delegated_to_user_id && (
                                        <div className="mt-2 text-xs text-slate-400">
                                            Delegated to: {action.delegated_to_user_id}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Completion info */}
                    {instance.completed_at && (
                        <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-500">
                            Completed: {formatters.formatDateTime(instance.completed_at)}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
