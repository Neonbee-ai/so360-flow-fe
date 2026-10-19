import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, AlertTriangle, CheckCircle, BarChart2 } from 'lucide-react';
import { Button, IconButton } from '@so360/design-system';
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
        <div className="flex items-center justify-center h-screen bg-bg">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
        </div>
    );

    return (
        <div className="min-h-screen bg-bg p-6">
            <div className="flex items-center gap-3 mb-8">
                <IconButton label="Back" icon={<ArrowLeft className="w-5 h-5" />} onClick={() => navigate('/flow')} />
                <div>
                    <h1 className="text-2xl font-bold text-fg">Approval Dashboard</h1>
                    <p className="text-fg-muted text-sm">Approval workflow overview</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-surface/50 border border-line rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-primary" />
                        <span className="text-fg-muted text-sm">Pending</span>
                    </div>
                    <p className="text-3xl font-bold text-fg">{stats?.pending_count || 0}</p>
                </div>
                <div className="bg-surface/50 border border-line rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle className="w-5 h-5 text-danger" />
                        <span className="text-fg-muted text-sm">Overdue</span>
                    </div>
                    <p className="text-3xl font-bold text-danger">{stats?.overdue_count || 0}</p>
                </div>
                <div className="bg-surface/50 border border-line rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <span className="text-fg-muted text-sm">Avg Cycle</span>
                    </div>
                    <p className="text-3xl font-bold text-fg">{stats?.avg_cycle_hours || 0}<span className="text-lg text-fg-muted">h</span></p>
                </div>
            </div>

            {/* By Entity Type */}
            {stats && Object.keys(stats.by_entity_type || {}).length > 0 && (
                <div className="bg-surface/50 border border-line rounded-xl p-5 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart2 className="w-4 h-4 text-fg-muted" />
                        <h2 className="text-fg font-medium">Completed by Entity Type</h2>
                    </div>
                    <div className="space-y-3">
                        {Object.entries(stats.by_entity_type).map(([type, count]) => (
                            <div key={type} className="flex items-center gap-3">
                                <span className="text-fg-muted text-sm w-32 truncate">{type}</span>
                                <div className="flex-1 bg-surface-raised rounded-full h-2">
                                    <div className="bg-primary h-2 rounded-full" style={{ width: `${(count / maxByEntityType) * 100}%` }} />
                                </div>
                                <span className="text-fg text-sm w-8 text-right">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Pending */}
            <div className="bg-surface/50 border border-line rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-fg font-medium">Recent Pending</h2>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/flow/approvals/pending')}>View All →</Button>
                </div>
                {recentApprovals.length === 0 ? (
                    <p className="text-fg-subtle text-sm">No pending approvals</p>
                ) : (
                    <div className="space-y-2">
                        {recentApprovals.slice(0, 5).map(a => (
                            <div key={a.id} className="flex items-center justify-between py-2 border-b border-line last:border-0">
                                <div>
                                    <span className="text-fg text-sm">{a.entity_data?.name || a.entity_data?.title || `${a.entity_type} #${a.entity_id?.slice(0, 8)}`}</span>
                                    <span className="text-fg-subtle text-xs ml-2">{a.time_elapsed_hours}h elapsed</span>
                                </div>
                                {a.is_overdue && <span className="text-danger text-xs">OVERDUE</span>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
