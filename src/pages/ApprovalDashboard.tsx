import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import {
    Button,
    Card,
    Cluster,
    DashboardPageTemplate,
    DataTable,
    EmptyState,
    KpiCard,
    Progress,
    Skeleton,
    Stack,
    type DataTableColumn,
} from '@so360/design-system';
import { flowApi } from '../services/flowApi';
import type { ApprovalStats } from '../types/flow';

export const ApprovalDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<ApprovalStats | null>(null);
    const [recentApprovals, setRecentApprovals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            flowApi.getApprovalStats().then(res => setStats(res.data)),
            flowApi.getPendingApprovals().then(res => setRecentApprovals(res.data?.slice(0, 20) || [])),
        ]).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const maxByEntityType = stats ? Math.max(...Object.values(stats.by_entity_type || {}), 1) : 1;

    if (loading) return (
        <div role="status" aria-busy="true" className="p-4">
            <span className="sr-only">Loading…</span>
            <div className="grid grid-cols-3 gap-4 mb-6">{[0, 1, 2].map((i) => <Skeleton key={i} variant="rect" className="h-24" />)}</div>
            <Skeleton lines={6} />
        </div>
    );

    const recentColumns: DataTableColumn<any>[] = [
        {
            key: 'name',
            header: 'Entity',
            render: (a) => a.entity_data?.name || a.entity_data?.title || `${a.entity_type} #${a.entity_id?.slice(0, 8)}`,
        },
        { key: 'elapsed', header: 'Elapsed', align: 'right', render: (a) => `${a.time_elapsed_hours}h elapsed` },
        { key: 'overdue', header: 'Status', render: (a) => (a.is_overdue ? <span className="text-danger text-xs">OVERDUE</span> : null) },
    ];

    return (
        <DashboardPageTemplate
            title="Approval Dashboard"
            description="Approval workflow overview"
            trail={[{ label: 'Flow', onClick: () => navigate('/flow') }]}
            kpis={[
                <KpiCard key="pending" label="Pending" value={stats?.pending_count || 0} icon={Clock} />,
                <KpiCard key="overdue" label="Overdue" value={stats?.overdue_count || 0} icon={AlertTriangle} />,
                <KpiCard key="cycle" label="Avg Cycle" value={<>{stats?.avg_cycle_hours || 0}<span className="text-fg-muted">h</span></>} icon={CheckCircle} />,
            ]}
            primary={
                stats && Object.keys(stats.by_entity_type || {}).length > 0 ? (
                    <Card title="Completed by Entity Type">
                        <Stack gap="default">
                            {Object.entries(stats.by_entity_type).map(([type, count]) => (
                                <Cluster key={type} gap="default" justify="between">
                                    <span className="text-fg-muted text-sm w-32 truncate">{type}</span>
                                    <div className="flex-1">
                                        <Progress value={(count / maxByEntityType) * 100} label={type} size="sm" />
                                    </div>
                                    <span className="text-fg text-sm w-8 text-right">{count}</span>
                                </Cluster>
                            ))}
                        </Stack>
                    </Card>
                ) : undefined
            }
            bottom={
                <Card
                    title="Recent Pending"
                    actions={<Button variant="ghost" size="sm" onClick={() => navigate('/flow/approvals/pending')}>View All →</Button>}
                    padding="none"
                >
                    <DataTable
                        columns={recentColumns}
                        rows={recentApprovals.slice(0, 5)}
                        rowKey={(a) => a.id}
                        onRowClick={() => navigate('/flow/approvals/pending')}
                        emptyState={<EmptyState title="No pending approvals" />}
                    />
                </Card>
            }
        />
    );
};
