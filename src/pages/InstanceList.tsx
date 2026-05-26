import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Eye, CheckCircle, Clock, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { QuotaBar, QuotaGate } from '@so360/design-system';
import { useQuota, useShell, useSandboxLimit } from '@so360/shell-context';
import { flowApi } from '../services/flowApi';
import type { FlowInstance, FlowDefinition } from '../types/flow';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | 'active' | 'completed' | 'cancelled' | 'suspended';

export const InstanceList = () => {
    const navigate = useNavigate();
    const { currentOrg } = useShell();
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
        if (instance.completed_at) return 'text-green-400';
        if (instance.current_state === 'PENDING_APPROVAL') return 'text-yellow-400';
        return 'text-cyan-400';
    };

    const isCompleted = (instance: FlowInstance) => !!instance.completed_at;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                            <Activity className="w-8 h-8 text-blue-500" />
                            Flow Instances
                        </h1>
                        <p className="text-slate-400 mt-2">
                            {total > 0
                                ? `${total} workflow instance${total !== 1 ? 's' : ''} across your organization`
                                : 'View and manage active workflow instances'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadInstances}
                            disabled={loading}
                            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => navigate('/flow')}
                            className="px-4 py-2 bg-slate-800 text-slate-100 rounded-lg hover:bg-slate-700 transition-colors"
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
                    <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/25 rounded-lg text-amber-400 text-sm">
                        <span className="font-semibold">Sandbox:</span>
                        <span>Showing {sandboxEntryLimit} of {total} records. Switch to Production to view all.</span>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-400 font-medium">Filters</span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {/* Status filter */}
                        <div>
                            <label className="text-xs text-slate-500 block mb-1.5">Status</label>
                            <div className="flex gap-1">
                                {(['all', 'active', 'completed', 'cancelled', 'suspended'] as StatusFilter[]).map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(s)}
                                        className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors ${
                                            statusFilter === s
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Entity type filter */}
                        <div>
                            <label className="text-xs text-slate-500 block mb-1.5">Entity Type</label>
                            <select
                                value={entityTypeFilter}
                                onChange={(e) => setEntityTypeFilter(e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                            >
                                <option value="">All Types</option>
                                <option value="lead">CRM - Lead</option>
                                <option value="deal">CRM - Deal</option>
                                <option value="task">Projects - Task</option>
                                <option value="project">Projects - Project</option>
                                <option value="expense">Accounting - Expense</option>
                                <option value="invoice">Accounting - Invoice</option>
                                <option value="purchase_requisition">Procurement - PR</option>
                                <option value="purchase_order">Procurement - PO</option>
                                <option value="timesheet_batch">Timesheet - Batch</option>
                                <option value="order">Daily Store - Order</option>
                                <option value="support_ticket">Support - Ticket</option>
                                <option value="fulfillment_order">Fulfillment - Order</option>
                            </select>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-lg p-4 flex items-center justify-between">
                        <p className="text-red-400">{error}</p>
                        <button
                            onClick={loadInstances}
                            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Instances List */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 animate-pulse">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="h-5 bg-slate-800 rounded w-48"></div>
                                        <div className="h-3 bg-slate-800 rounded w-24"></div>
                                    </div>
                                    <div className="h-8 w-16 bg-slate-800 rounded"></div>
                                </div>
                                <div className="grid grid-cols-4 gap-4">
                                    {[1, 2, 3, 4].map((j) => (
                                        <div key={j} className="space-y-1">
                                            <div className="h-3 bg-slate-800 rounded w-16"></div>
                                            <div className="h-4 bg-slate-800 rounded w-24"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : instances.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-12 text-center">
                        <Activity className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-400 text-lg mb-2">No flow instances found</p>
                        <p className="text-slate-500 text-sm">
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
                                        className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 hover:border-blue-500/50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/flow/instance/${instance.id}`)}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-base font-semibold text-slate-100 truncate">
                                                        {flowDef?.name || 'Unknown Flow'}
                                                    </h3>
                                                    {completed ? (
                                                        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/30 flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Completed
                                                        </span>
                                                    ) : instance.current_state === 'PENDING_APPROVAL' ? (
                                                        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-500/30 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            Pending Approval
                                                        </span>
                                                    ) : (
                                                        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {flowDef?.module_code || 'N/A'}
                                                </div>
                                            </div>
                                            <button
                                                className="shrink-0 ml-4 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
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
                                                <div className="text-xs text-slate-500 mb-1">Current State</div>
                                                <div className={`font-medium ${getStateColor(instance)}`}>
                                                    {getStateName(instance)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500 mb-1">Entity Type</div>
                                                <div className="text-slate-300 capitalize">{instance.entity_type}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500 mb-1">
                                                    {completed ? 'Completed' : 'Started'}
                                                </div>
                                                <div className="text-slate-300">
                                                    {completed
                                                        ? new Date(instance.completed_at!).toLocaleDateString()
                                                        : new Date(instance.started_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500 mb-1">Instance ID</div>
                                                <div className="text-slate-400 font-mono text-xs truncate">
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
                            <div className="flex items-center justify-between mt-6 text-sm text-slate-400">
                                <span>
                                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage((p) => p - 1)}
                                        disabled={page === 0}
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="px-3">
                                        Page {page + 1} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage((p) => p + 1)}
                                        disabled={page >= totalPages - 1}
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
