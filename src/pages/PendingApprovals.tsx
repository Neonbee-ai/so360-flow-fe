import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, UserPlus, AlertTriangle, X } from 'lucide-react';
import { useActivity, useShellBridge } from '@so360/shell-context';
import { flowApi } from '../services/flowApi';
import type { PendingApproval } from '../types/flow';
import { useFlowFormatters } from '../utils/formatters';

type ModalType = 'approve' | 'reject' | 'delegate' | null;

interface ModalState {
    type: ModalType;
    approval: PendingApproval | null;
}

export const PendingApprovals: React.FC = () => {
    const navigate = useNavigate();
    const { recordActivity } = useActivity();
    const shell = useShellBridge();
    const formatters = useFlowFormatters();
    const canApprovalAction = (shell?.effectiveFlagsLoaded !== false) && (shell?.isFeatureEnabled?.('action:flow:approval:action') ?? true);
    const [approvals, setApprovals] = useState<PendingApproval[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionInProgress, setActionInProgress] = useState<string | null>(null);
    const [modal, setModal] = useState<ModalState>({ type: null, approval: null });
    const [comment, setComment] = useState('');
    const [delegateTo, setDelegateTo] = useState('');
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchPendingApprovals = useCallback(async () => {
        try {
            const response = await flowApi.getPendingApprovals();
            setApprovals(response.data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load pending approvals');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPendingApprovals();
        // Skip polling while the tab is backgrounded — a hidden approvals view
        // doesn't need fresh data, and we refetch immediately on the next tick.
        pollRef.current = setInterval(() => {
            if (typeof document !== 'undefined' && document.hidden) return;
            fetchPendingApprovals();
        }, 30000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [fetchPendingApprovals]);

    const openModal = (type: ModalType, approval: PendingApproval) => {
        setComment('');
        setDelegateTo('');
        setModal({ type, approval });
    };

    const closeModal = () => setModal({ type: null, approval: null });

    const handleApprove = async () => {
        if (!modal.approval) return;
        setActionInProgress(modal.approval.id);
        try {
            await flowApi.performApprovalAction({
                approval_instance_id: modal.approval.id,
                step_id: modal.approval.current_step.id,
                action: 'APPROVE',
                comment: comment || 'Approved',
            });
            recordActivity({
                eventType: 'approval.approved',
                eventCategory: 'data',
                description: `Approved ${modal.approval.entity_type} #${modal.approval.entity_id.slice(0, 8)}`,
                resourceType: 'approval',
                resourceId: modal.approval.id,
            }).catch(() => {});
            closeModal();
            await fetchPendingApprovals();
        } catch (err: any) {
            alert(`Failed to approve: ${err.message}`);
        } finally {
            setActionInProgress(null);
        }
    };

    const handleReject = async () => {
        if (!modal.approval || comment.trim().length < 10) return;
        setActionInProgress(modal.approval.id);
        try {
            await flowApi.performApprovalAction({
                approval_instance_id: modal.approval.id,
                step_id: modal.approval.current_step.id,
                action: 'REJECT',
                comment,
            });
            recordActivity({
                eventType: 'approval.rejected',
                eventCategory: 'data',
                description: `Rejected ${modal.approval.entity_type} #${modal.approval.entity_id.slice(0, 8)}`,
                resourceType: 'approval',
                resourceId: modal.approval.id,
            }).catch(() => {});
            closeModal();
            await fetchPendingApprovals();
        } catch (err: any) {
            alert(`Failed to reject: ${err.message}`);
        } finally {
            setActionInProgress(null);
        }
    };

    const handleDelegate = async () => {
        if (!modal.approval || !delegateTo.trim() || !comment.trim()) return;
        setActionInProgress(modal.approval.id);
        try {
            await flowApi.performApprovalAction({
                approval_instance_id: modal.approval.id,
                step_id: modal.approval.current_step.id,
                action: 'DELEGATE',
                comment,
                delegate_to_user_id: delegateTo.trim(),
            });
            closeModal();
            await fetchPendingApprovals();
        } catch (err: any) {
            alert(`Failed to delegate: ${err.message}`);
        } finally {
            setActionInProgress(null);
        }
    };

    const getEntityTitle = (approval: PendingApproval) =>
        approval.entity_data?.name || approval.entity_data?.title || approval.entity_data?.reference_number ||
        `${approval.entity_type} #${approval.entity_id.slice(0, 8)}`;

    const getStepContext = (approval: PendingApproval) => {
        const current = approval.current_step?.step_order || 1;
        return `Step ${current}`;
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 p-8">
            <div className="animate-pulse space-y-4">
                <div className="h-10 bg-slate-800 rounded w-64" />
                {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-900 rounded" />)}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 p-8">
            {/* Approve Modal */}
            {modal.type === 'approve' && modal.approval && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[600]">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-100">Approve: {getEntityTitle(modal.approval)}</h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-100"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="mb-4">
                            <label className="text-sm text-slate-400 mb-1 block">Comment (optional)</label>
                            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
                                className="w-full bg-slate-950 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm"
                                placeholder="Add an optional comment..." />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={closeModal} className="px-4 py-2 text-slate-400 hover:text-slate-100">Cancel</button>
                            <button onClick={handleApprove} disabled={actionInProgress === modal.approval.id}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                                <CheckCircle className="w-4 h-4" /> Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {modal.type === 'reject' && modal.approval && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[600]">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-100">Reject: {getEntityTitle(modal.approval)}</h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-100"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="mb-4">
                            <label className="text-sm text-slate-400 mb-1 block">Rejection Reason * (min 10 characters)</label>
                            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
                                className="w-full bg-slate-950 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm"
                                placeholder="Explain why this is being rejected..." />
                            {comment.length > 0 && comment.length < 10 && (
                                <p className="text-red-400 text-xs mt-1">{10 - comment.length} more characters required</p>
                            )}
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={closeModal} className="px-4 py-2 text-slate-400 hover:text-slate-100">Cancel</button>
                            <button onClick={handleReject} disabled={comment.trim().length < 10 || actionInProgress === modal.approval.id}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                                <XCircle className="w-4 h-4" /> Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delegate Modal */}
            {modal.type === 'delegate' && modal.approval && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[600]">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-100">Delegate: {getEntityTitle(modal.approval)}</h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-100"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="mb-3">
                            <label className="text-sm text-slate-400 mb-1 block">Delegate To (User ID) *</label>
                            <input value={delegateTo} onChange={e => setDelegateTo(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm"
                                placeholder="Enter user UUID..." />
                        </div>
                        <div className="mb-4">
                            <label className="text-sm text-slate-400 mb-1 block">Reason *</label>
                            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
                                className="w-full bg-slate-950 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm"
                                placeholder="Why are you delegating?" />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={closeModal} className="px-4 py-2 text-slate-400 hover:text-slate-100">Cancel</button>
                            <button onClick={handleDelegate} disabled={!delegateTo.trim() || !comment.trim() || actionInProgress === modal.approval.id}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                <UserPlus className="w-4 h-4" /> Delegate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-100 mb-2">Pending Approvals</h1>
                <div className="flex items-center gap-4">
                    <p className="text-slate-400">{approvals.length} approval{approvals.length !== 1 ? 's' : ''} awaiting your action</p>
                    {error && (
                        <>
                            <p className="text-red-400 text-sm">{error}</p>
                            <button onClick={fetchPendingApprovals} className="text-xs text-blue-400 hover:text-blue-300 underline">Retry</button>
                        </>
                    )}
                </div>
            </div>

            {approvals.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/30 rounded-lg border border-slate-800">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">All Caught Up!</h3>
                    <p className="text-slate-500">No pending approvals at this time</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {approvals.map(approval => (
                        <div key={approval.id}
                            className={`bg-slate-900/50 rounded-lg border ${approval.is_overdue ? 'border-red-500/50' : 'border-slate-800'} p-6`}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <h3 className="text-lg font-semibold text-slate-100">{getEntityTitle(approval)}</h3>
                                        <span className="px-2 py-0.5 bg-blue-900/40 text-blue-300 text-xs rounded">{getStepContext(approval)}</span>
                                        {approval.is_overdue && (
                                            <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs font-medium rounded">OVERDUE</span>
                                        )}
                                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded uppercase">{approval.status}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-400">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4" />
                                            <span>{approval.time_elapsed_hours}h elapsed{approval.sla_hours ? ` / ${approval.sla_hours}h SLA` : ''}</span>
                                        </div>
                                        <span>Requested {formatters.formatDateTime(approval.requested_at)}</span>
                                        <button onClick={() => navigate(`/flow/approvals/history/${approval.entity_type}/${approval.entity_id}`)}
                                            className="text-blue-400 hover:text-blue-300 text-xs">View History →</button>
                                    </div>
                                </div>
                            </div>

                            {approval.entity_data && Object.keys(approval.entity_data).length > 0 && (
                                <div className="mb-4 p-4 bg-slate-800/50 rounded-lg">
                                    <div className="text-xs text-slate-500 mb-2">Entity Details:</div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                        {Object.entries(approval.entity_data).slice(0, 6).map(([key, value]) => (
                                            <div key={key}>
                                                <span className="text-slate-500">{key}: </span>
                                                <span className="text-slate-300">{String(value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {canApprovalAction && (
                                <div className="flex items-center gap-3">
                                    <button onClick={() => openModal('approve', approval)} disabled={actionInProgress === approval.id}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-slate-50 rounded-lg font-medium">
                                        <CheckCircle className="w-4 h-4" /> Approve
                                    </button>
                                    <button onClick={() => openModal('reject', approval)} disabled={actionInProgress === approval.id}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-slate-50 rounded-lg font-medium">
                                        <XCircle className="w-4 h-4" /> Reject
                                    </button>
                                    {approval.current_step?.can_delegate && (
                                        <button onClick={() => openModal('delegate', approval)} disabled={actionInProgress === approval.id}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-slate-50 rounded-lg font-medium">
                                            <UserPlus className="w-4 h-4" /> Delegate
                                        </button>
                                    )}
                                </div>
                            )}

                            {approval.is_overdue && (
                                <div className="mt-4 flex items-start gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-red-300">
                                        Exceeded its SLA of {approval.sla_hours}h. Immediate action required.
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
