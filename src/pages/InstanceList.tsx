import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { QuotaBar, Badge, Button, DataTable, EmptyState, IconButton, ListPageTemplate, Pagination, type DataTableColumn } from '@so360/design-system';
import { useQuota, useShell, useSandboxLimit } from '@so360/shell-context';
import { flowApi } from '../services/flowApi';
import type { FlowInstance, FlowDefinition } from '../types/flow';
import { useFlowFormatters } from '../utils/formatters';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | 'active' | 'completed' | 'cancelled' | 'suspended';

const STATUS_OPTIONS = (['active', 'completed', 'cancelled', 'suspended'] as const).map((v) => ({
    value: v,
    label: v.charAt(0).toUpperCase() + v.slice(1),
}));

const ENTITY_TYPE_OPTIONS = [
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
    const visibleInstances = isSandboxMode ? instances.slice(0, sandboxEntryLimit) : instances;
    const hasFilters = statusFilter !== 'all' || !!entityTypeFilter;

    const columns: DataTableColumn<FlowInstance>[] = [
        {
            key: 'flow',
            header: 'Flow',
            render: (instance) => {
                const flowDef = instance.flows as unknown as FlowDefinition;
                const completed = isCompleted(instance);
                return (
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-fg truncate">{flowDef?.name || 'Unknown Flow'}</span>
                            {completed ? (
                                <Badge tone="success" size="sm"><CheckCircle className="w-3 h-3" />Completed</Badge>
                            ) : instance.current_state === 'PENDING_APPROVAL' ? (
                                <Badge tone="warning" size="sm"><Clock className="w-3 h-3" />Pending Approval</Badge>
                            ) : (
                                <Badge tone="info" size="sm"><Clock className="w-3 h-3" />Active</Badge>
                            )}
                        </div>
                        <div className="text-xs text-fg-subtle">{flowDef?.module_code || 'N/A'}</div>
                    </div>
                );
            },
        },
        {
            key: 'current_state',
            header: 'Current State',
            render: (instance) => <span className={`font-medium ${getStateColor(instance)}`}>{getStateName(instance)}</span>,
        },
        { key: 'entity_type', header: 'Entity Type', hideBelow: 'medium', render: (instance) => <span className="capitalize">{instance.entity_type}</span> },
        {
            key: 'date',
            header: 'Started / Completed',
            hideBelow: 'medium',
            render: (instance) =>
                isCompleted(instance)
                    ? `Completed ${formatters.formatDate(instance.completed_at!)}`
                    : `Started ${formatters.formatDate(instance.started_at)}`,
        },
        {
            key: 'id',
            header: 'Instance ID',
            hideBelow: 'expanded',
            render: (instance) => <span className="text-fg-muted font-mono text-xs truncate">{instance.id}</span>,
        },
    ];

    return (
        <ListPageTemplate
            title="Flow Instances"
            trail={[{ label: 'Dashboard', onClick: () => navigate('/flow') }]}
            description={
                total > 0
                    ? `${total} workflow instance${total !== 1 ? 's' : ''} across your organization`
                    : 'View and manage active workflow instances'
            }
            count={loading ? undefined : total}
            filterConfig={{
                fields: [
                    { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
                    { key: 'entity_type', label: 'Entity Type', type: 'select', options: ENTITY_TYPE_OPTIONS },
                ],
                values: { status: statusFilter === 'all' ? '' : statusFilter, entity_type: entityTypeFilter },
                onChange: (values) => {
                    setStatusFilter(((values.status as string) || 'all') as StatusFilter);
                    setEntityTypeFilter((values.entity_type as string) || '');
                },
                onClear: () => {
                    setStatusFilter('all');
                    setEntityTypeFilter('');
                },
            }}
            toolbarEnd={
                <IconButton
                    label="Refresh"
                    icon={<RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />}
                    onClick={loadInstances}
                    disabled={loading}
                />
            }
            pagination={
                totalPages > 1 ? (
                    <Pagination
                        currentPage={page + 1}
                        totalPages={totalPages}
                        totalItems={total}
                        pageSize={PAGE_SIZE}
                        onPageChange={(p) => setPage(p - 1)}
                    />
                ) : undefined
            }
        >
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

            {error && (
                <div className="mb-4 bg-danger-container/20 border border-danger/30 rounded-lg p-4 flex items-center justify-between">
                    <p className="text-danger">{error}</p>
                    <Button variant="secondary" size="sm" onClick={loadInstances}>
                        Retry
                    </Button>
                </div>
            )}

            <DataTable
                columns={columns}
                rows={visibleInstances}
                rowKey={(instance) => instance.id}
                loading={loading}
                onRowClick={(instance) => navigate(`/flow/instance/${instance.id}`)}
                emptyState={
                    <EmptyState
                        icon={Activity}
                        title="No flow instances found"
                        description={
                            hasFilters
                                ? 'Try adjusting or clearing the filters above.'
                                : 'Flow instances are created when a workflow is triggered for an entity.'
                        }
                    />
                }
            />
        </ListPageTemplate>
    );
};
