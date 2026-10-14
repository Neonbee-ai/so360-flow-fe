import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Eye, CheckCircle, Clock, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { QuotaBar, QuotaGate, Select } from '@so360/design-system';
import { useQuota, useShell, useSandboxLimit } from '@so360/shell-context';
import { flowApi } from '../services/flowApi';
import type { FlowInstance, FlowDefinition } from '../types/flow';
import { useFlowFormatters } from '../utils/formatters';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | 'active' | 'completed' | 'cancelled' | 'suspended';

const ENTITY_TYPE_OPTIONS = [
    { value: '', label: 'All Types' },
                                    { value: 'lead', label: 'CRM - Lead' },
                                    { value: 'deal', label: 'CRM - Deal' },
                                    { value: 'task', label: 'Projects - Task' },
                                    { value: 'project', label: 'Projects - Project' },
                                    { value: 'expense', label: 'Accounting - Expense' },
                                    { value: 'invoice', label: 'Accounting - Invoice' },
                                    { value: 'purchase_requisition', label: 'Procurement - PR' },
                                    { value: 'purchase_order', label: 'Procurement - PO' },
                                    { value: 'timesheet_batch', label: 'Timesheet - Batch' },
                                    { value: 'order', label: 'Daily Store - Order' },
                                    { value: 'support_ticket', label: 'Support - Ticket' },
                                    { value: 'fulfillment_order', label: 'Fulfillment - Order' },
];

export const InstanceList = () => {
    const navigate = useNavigate();
    const { currentOrg } = useShell();
    const formatters = useFlowFormatters();
    const quotaChecks = useMemo(() => [{ module_code: 'flow', quota_key: 'max_flows' }], []);
    const { getQuota, isExceeded } = useQuota({
        checks: quotaChecks,
        orgId: currentOrg?.id || '',
    });
    const quotaData = getQuota('max_flows');
    const { isSandboxMode, sandboxEntryLimit, limitItems, isLimited } = useSandboxLimit();
    const [instances, setInstances] = useState<FlowInstance[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [entityTypeFilter, setEntityTypeFilter] = useState('');
    const [page, setPage] = useState(0);

    const loadInstances = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await flowApi.getAllInstances({
                status: statusFilter !== 'all' ? statusFilter : undefined,
                entity_type: entityTypeFilter.trim() || undefined,
                limit: PAGE_SIZE,
                offset: page * PAGE_SIZE,
            });
            setInstances(response.data.data);
            setTotal(response.data.total);
        } catch (err: any) {
            console.error('Failed to load instances:', err);
            setError(err.response?.data?.message || 'Failed to load instances');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, entityTypeFilter, page]);

    useEffect(() => {
        loadInstances();
    }, [loadInstances]);

    // Reset page when filters change
    useEffect(() => {
        setPage(0);
    }, [statusFilter, entityTypeFilter]);

    const getStateName = (instance: FlowInstance) => {
        const flowDef = instance.flows as unknown as FlowDefinition;
        const state = flowDef?.states?.find((s) => s.code === instance.current_state);
        return state?.name || instance.current_state;
    };

    const getStateColor = (instance: FlowInstance) => {
        if (instance.completed_at) return 'text-success';
        if (instance.current_state === 'PENDING_APPROVAL') return 'text-warning';
        return 'text-info';
    };

    const isCompleted = (instance: FlowInstance) => !!instance.completed_at;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="min-h-screen bg-bg p-6">
            <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-fg flex items-center gap-3">
                            <Activity className="w-8 h-8 text-primary" />
                            Flow Instances
                        </h1>
                        <p className="text-fg-muted mt-2">
                            {total > 0
                                ? `${total} workflow instance${total !== 1 ? 's' : ''} across your organization`
                                : 'View and manage active workflow instances'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadInstances}
                            disabled={loading}
                            className="p-2 text-fg-muted hover:text-fg hover:bg-surface-raised rounded-lg transition-colors disabled:opacity-50"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => navigate('/flow')}
                            className="px-4 py-2 bg-surface-raised text-fg rounded-lg hover:bg-line transition-colors"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>

                {quotaData && (
                    <QuotaBar
                        label="Flows"
                        used={quotaData.current_usage}
                        limit={quotaData.limit}
                        isUnlimited={quotaData.is_unlimited}
                    />
                )}

                {isSandboxMode && isLimited(total) && (
                    <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-warning/10 border border-warning/25 rounded-lg text-warning text-sm">
                        <span className="font-semibold">Sandbox:</span>
                        <span>Showing {sandboxEntryLimit} of {total} records. Switch to Production to view all.</span>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-surface/50 border border-line rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Filter className="w-4 h-4 text-fg-muted" />
                        <span className="text-sm text-fg-muted font-medium">Filters</span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {/* Status filter */}
                        <div>
                            <label className="text-xs text-fg-subtle block mb-1.5">Status</label>
                            <div className="flex gap-1">
                                {(['all', 'active', 'completed', 'cancelled', 'suspended'] as StatusFilter[]).map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(s)}
                                        className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors ${
                                            statusFilter === s
                                                ? 'bg-primary text-primary-fg'
                                                : 'bg-surface-raised text-fg-muted hover:bg-line hover:text-fg'
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Entity type filter */}
                        <div>
                            <label className="text-xs text-fg-subtle block mb-1.5">Entity Type</label>
                            <Select
                                name="entity-type-filter"
                                value={entityTypeFilter}
                                onChange={(e) => setEntityTypeFilter(e.target.value)}
                                options={ENTITY_TYPE_OPTIONS}
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 bg-danger-container/20 border border-danger/30 rounded-lg p-4 flex items-center justify-between">
                        <p className="text-danger">{error}</p>
                        <button
                            onClick={loadInstances}
                            className="px-3 py-1.5 bg-danger/20 hover:bg-danger/30 text-danger rounded-lg text-sm"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Instances List */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-surface/50 border border-line rounded-lg p-6 animate-pulse">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="h-5 bg-surface-raised rounded w-48"></div>
                                        <div className="h-3 bg-surface-raised rounded w-24"></div>
                                    </div>
                                    <div className="h-8 w-16 bg-surface-raised rounded"></div>
                                </div>
                                <div className="grid grid-cols-4 gap-4">
                                    {[1, 2, 3, 4].map((j) => (
                                        <div key={j} className="space-y-1">
                                            <div className="h-3 bg-surface-raised rounded w-16"></div>
                                            <div className="h-4 bg-surface-raised rounded w-24"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : instances.length === 0 ? (
                    <div className="bg-surface/50 border border-line rounded-lg p-12 text-center">
                        <Activity className="w-16 h-16 text-fg-muted mx-auto mb-4" />
                        <p className="text-fg-muted text-lg mb-2">No flow instances found</p>
                        <p className="text-fg-subtle text-sm">
                            {statusFilter !== 'all' || entityTypeFilter
                                ? 'Try adjusting or clearing the filters above.'
                                : 'Flow instances are created when a workflow is triggered for an entity.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-4">
                            {(isSandboxMode ? instances.slice(0, sandboxEntryLimit) : instances).map((instance) => {
                                const flowDef = instance.flows as unknown as FlowDefinition;
                                const completed = isCompleted(instance);

                                return (
                                    <div
                                        key={instance.id}
                                        className="bg-surface/50 border border-line rounded-lg p-6 hover:border-primary/50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/flow/instance/${instance.id}`)}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-base font-semibold text-fg truncate">
                                                        {flowDef?.name || 'Unknown Flow'}
                                                    </h3>
                                                    {completed ? (
                                                        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-success-container/30 text-success border border-success/30 flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Completed
                                                        </span>
                                                    ) : instance.current_state === 'PENDING_APPROVAL' ? (
                                                        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/30 text-warning border border-warning/30 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            Pending Approval
                                                        </span>
                                                    ) : (
                                                        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-container/30 text-primary border border-primary/30 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-fg-subtle">
                                                    {flowDef?.module_code || 'N/A'}
                                                </div>
                                            </div>
                                            <button
                                                className="shrink-0 ml-4 px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-fg rounded-lg text-sm flex items-center gap-2 transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/flow/instance/${instance.id}`);
                                                }}
                                            >
                                                <Eye className="w-4 h-4" />
                                                View
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <div className="text-xs text-fg-subtle mb-1">Current State</div>
                                                <div className={`font-medium ${getStateColor(instance)}`}>
                                                    {getStateName(instance)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-fg-subtle mb-1">Entity Type</div>
                                                <div className="text-fg capitalize">{instance.entity_type}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-fg-subtle mb-1">
                                                    {completed ? 'Completed' : 'Started'}
                                                </div>
                                                <div className="text-fg">
                                                    {completed
                                                        ? formatters.formatDate(instance.completed_at!)
                                                        : formatters.formatDate(instance.started_at)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-fg-subtle mb-1">Instance ID</div>
                                                <div className="text-fg-muted font-mono text-xs truncate">
                                                    {instance.id}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-6 text-sm text-fg-muted">
                                <span>
                                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage((p) => p - 1)}
                                        disabled={page === 0}
                                        className="p-1.5 rounded-lg bg-surface-raised hover:bg-line disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="px-3">
                                        Page {page + 1} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage((p) => p + 1)}
                                        disabled={page >= totalPages - 1}
                                        className="p-1.5 rounded-lg bg-surface-raised hover:bg-line disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
