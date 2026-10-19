import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, UserPlus, AlertTriangle } from 'lucide-react';
import { useActivity, useShellBridge } from '@so360/shell-context';
import { toast, Modal, Button, Textarea, TextField, Grid, GridItem } from '@so360/design-system';
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
            toast.success('Approved');
            await fetchPendingApprovals();
        } catch {
            // Error toast comes from the flowApi interceptor.
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
            toast.success('Rejected');
            await fetchPendingApprovals();
        } catch {
            // Error toast comes from the flowApi interceptor.
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
            toast.success('Delegated');
            await fetchPendingApprovals();
        } catch {
            // Error toast comes from the flowApi interceptor.
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
        <div className="min-h-screen bg-bg p-8">
            <div className="animate-pulse space-y-4">
                <div className="h-10 bg-surface-raised rounded w-64" />
                {[1, 2, 3].map(i => <div key={i} className="h-32 bg-surface rounded" />)}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-bg p-8">
            {/* Approve Modal */}
            <Modal
                open={modal.type === 'approve' && !!modal.approval}
                onClose={closeModal}
                title={modal.approval ? `Approve: ${getEntityTitle(modal.approval)}` : ''}
                footer={modal.approval && (
                    <>
                        <Button variant="ghost" onClick={closeModal}>Cancel</Button>
                        <Button onClick={handleApprove} disabled={actionInProgress === modal.approval.id}>
                            <CheckCircle className="w-4 h-4" /> Approve
                        </Button>
                    </>
                )}
            >
                <Textarea
                    name="approve-comment"
                    label="Comment (optional)"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={3}
                    placeholder="Add an optional comment..."
                />
            </Modal>

            {/* Reject Modal */}
            <Modal
                open={modal.type === 'reject' && !!modal.approval}
                onClose={closeModal}
                title={modal.approval ? `Reject: ${getEntityTitle(modal.approval)}` : ''}
                footer={modal.approval && (
                    <>
                        <Button variant="ghost" onClick={closeModal}>Cancel</Button>
                        <Button variant="danger" onClick={handleReject} disabled={comment.trim().length < 10 || actionInProgress === modal.approval.id}>
                            <XCircle className="w-4 h-4" /> Reject
                        </Button>
                    </>
                )}
            >
                <Textarea
                    name="reject-comment"
                    label="Rejection Reason * (min 10 characters)"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={3}
                    placeholder="Explain why this is being rejected..."
                />
                {comment.length > 0 && comment.length < 10 && (
                    <p className="text-danger text-xs mt-1">{10 - comment.length} more characters required</p>
                )}
            </Modal>

            {/* Delegate Modal */}
            <Modal
                open={modal.type === 'delegate' && !!modal.approval}
                onClose={closeModal}
                title={modal.approval ? `Delegate: ${getEntityTitle(modal.approval)}` : ''}
                footer={modal.approval && (
                    <>
                        <Button variant="ghost" onClick={closeModal}>Cancel</Button>
                        <Button onClick={handleDelegate} disabled={!delegateTo.trim() || !comment.trim() || actionInProgress === modal.approval.id}>
                            <UserPlus className="w-4 h-4" /> Delegate
                        </Button>
                    </>
                )}
            >
                <div className="space-y-3">
                    <TextField
                        name="delegate-to"
                        label="Delegate To (User ID) *"
                        value={delegateTo}
                        onChange={e => setDelegateTo(e.target.value)}
                        placeholder="Enter user UUID..."
                    />
                    <Textarea
                        name="delegate-reason"
                        label="Reason *"
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        rows={2}
                        placeholder="Why are you delegating?"
                    />
                </div>
            </Modal>

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-fg mb-2">Pending Approvals</h1>
                <div className="flex items-center gap-4">
                    <p className="text-fg-muted">{approvals.length} approval{approvals.length !== 1 ? 's' : ''} awaiting your action</p>
                    {error && (
                        <>
                            <p className="text-danger text-sm">{error}</p>
                            <Button variant="ghost" size="sm" onClick={fetchPendingApprovals}>Retry</Button>
                        </>
                    )}
                </div>
            </div>

            {approvals.length === 0 ? (
                <div className="text-center py-16 bg-surface/30 rounded-lg border border-line">
                    <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-fg mb-2">All Caught Up!</h3>
                    <p className="text-fg-subtle">No pending approvals at this time</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {approvals.map(approval => (
                        <div key={approval.id}
                            className={`bg-surface/50 rounded-lg border ${approval.is_overdue ? 'border-danger/50' : 'border-line'} p-6`}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <h3 className="text-lg font-semibold text-fg">{getEntityTitle(approval)}</h3>
                                        <span className="px-2 py-0.5 bg-primary-container/40 text-primary text-xs rounded">{getStepContext(approval)}</span>
                                        {approval.is_overdue && (
                                            <span className="px-2 py-0.5 bg-danger-container/30 text-danger text-xs font-medium rounded">OVERDUE</span>
                                        )}
                                        <span className="px-2 py-0.5 bg-surface-raised text-fg-muted text-xs rounded uppercase">{approval.status}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-fg-muted">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4" />
                                            <span>{approval.time_elapsed_hours}h elapsed{approval.sla_hours ? ` / ${approval.sla_hours}h SLA` : ''}</span>
                                        </div>
                                        <span>Requested {formatters.formatDateTime(approval.requested_at)}</span>
                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/flow/approvals/history/${approval.entity_type}/${approval.entity_id}`)}>View History →</Button>
                                    </div>
                                </div>
                            </div>

                            {approval.entity_data && Object.keys(approval.entity_data).length > 0 && (
                                <div className="mb-4 p-4 bg-surface-raised/50 rounded-lg">
                                    <div className="text-xs text-fg-subtle mb-2">Entity Details:</div>
                                    <Grid columns="auto" gap="sm" className="text-sm">
                                        {Object.entries(approval.entity_data).slice(0, 6).map(([key, value]) => (
                                            <GridItem key={key} span={4}>
                                                <span className="text-fg-subtle">{key}: </span>
                                                <span className="text-fg">{String(value)}</span>
                                            </GridItem>
                                        ))}
                                    </Grid>
                                </div>
                            )}

                            {canApprovalAction && (
                                <div className="flex items-center gap-3">
                                    <Button onClick={() => openModal('approve', approval)} disabled={actionInProgress === approval.id}>
                                        <CheckCircle className="w-4 h-4" /> Approve
                                    </Button>
                                    <Button variant="danger" onClick={() => openModal('reject', approval)} disabled={actionInProgress === approval.id}>
                                        <XCircle className="w-4 h-4" /> Reject
                                    </Button>
                                    {approval.current_step?.can_delegate && (
                                        <Button variant="secondary" onClick={() => openModal('delegate', approval)} disabled={actionInProgress === approval.id}>
                                            <UserPlus className="w-4 h-4" /> Delegate
                                        </Button>
                                    )}
                                </div>
                            )}

                            {approval.is_overdue && (
                                <div className="mt-4 flex items-start gap-2 p-3 bg-danger-container/20 border border-danger/30 rounded-lg">
                                    <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-danger">
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
