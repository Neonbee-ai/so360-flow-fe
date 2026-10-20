import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, UserPlus, AlertTriangle } from 'lucide-react';
import { useActivity, useShellBridge } from '@so360/shell-context';
import { toast, Modal, Button, Badge, Cluster, DataTable, EmptyState, ListPageTemplate, Stack, Textarea, TextField, type DataTableColumn } from '@so360/design-system';
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

    const columns: DataTableColumn<PendingApproval>[] = [
        {
            key: 'entity',
            header: 'Request',
            render: (approval) => (
                <Stack gap="tight">
                    <Cluster gap="tight">
                        <span className="font-medium text-fg">{getEntityTitle(approval)}</span>
                        <Badge tone="info" size="sm">{getStepContext(approval)}</Badge>
                        {approval.is_overdue && <Badge tone="danger" size="sm">OVERDUE</Badge>}
                    </Cluster>
                    {approval.is_overdue && (
                        <span className="flex items-center gap-1 text-xs text-danger">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            Exceeded its SLA of {approval.sla_hours}h. Immediate action required.
                        </span>
                    )}
                </Stack>
            ),
        },
        { key: 'status', header: 'Status', render: (approval) => <span className="text-xs text-fg-muted">{approval.status}</span> },
        {
            key: 'elapsed',
            header: 'Elapsed',
            hideBelow: 'medium',
            render: (approval) => <span>{approval.time_elapsed_hours}h elapsed{approval.sla_hours ? ` / ${approval.sla_hours}h SLA` : ''}</span>,
        },
        {
            key: 'requested',
            header: 'Requested',
            hideBelow: 'medium',
            render: (approval) => <span className="text-fg-muted">{formatters.formatDateTime(approval.requested_at)}</span>,
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (approval) => (
                <Cluster gap="tight" className="flex-nowrap">
                    {canApprovalAction && (
                        <>
                            <Button size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); openModal('approve', approval); }} disabled={actionInProgress === approval.id}>
                                <CheckCircle className="w-4 h-4" /> Approve
                            </Button>
                            <Button size="sm" variant="danger" onClick={(e: React.MouseEvent) => { e.stopPropagation(); openModal('reject', approval); }} disabled={actionInProgress === approval.id}>
                                <XCircle className="w-4 h-4" /> Reject
                            </Button>
                            {approval.current_step?.can_delegate && (
                                <Button size="sm" variant="secondary" onClick={(e: React.MouseEvent) => { e.stopPropagation(); openModal('delegate', approval); }} disabled={actionInProgress === approval.id}>
                                    <UserPlus className="w-4 h-4" /> Delegate
                                </Button>
                            )}
                        </>
                    )}
                </Cluster>
            ),
        },
    ];

    return (
        <>
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

            <ListPageTemplate
                title="Pending Approvals"
                description={`${approvals.length} approval${approvals.length !== 1 ? 's' : ''} awaiting your action`}
                loading={loading}
            >
                <Stack gap="default">
                    {error && (
                        <Cluster gap="tight">
                            <p className="text-danger text-sm">{error}</p>
                            <Button variant="ghost" size="sm" onClick={fetchPendingApprovals}>Retry</Button>
                        </Cluster>
                    )}
                    <DataTable
                        columns={columns}
                        rows={approvals}
                        rowKey={(approval) => approval.id}
                        onRowClick={(approval) => navigate(`/flow/approvals/history/${approval.entity_type}/${approval.entity_id}`)}
                        emptyState={
                            <EmptyState
                                icon={CheckCircle}
                                title="All Caught Up!"
                                description="No pending approvals at this time"
                            />
                        }
                    />
                </Stack>
            </ListPageTemplate>
        </>
    );
};
