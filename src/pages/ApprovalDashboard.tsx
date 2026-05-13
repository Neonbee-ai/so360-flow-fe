import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, AlertTriangle, CheckCircle, BarChart2 } from 'lucide-react';
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
        <div className="flex items-center justify-center h-screen bg-slate-950">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="flex items-center gap-3 mb-8">
                <button onClick={() => navigate('/flow')} className="text-slate-400 hover:text-slate-100"><ArrowLeft className="w-5 h-5" /></button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Approval Dashboard</h1>
                    <p className="text-slate-400 text-sm">Approval workflow overview</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-blue-400" />
                        <span className="text-slate-400 text-sm">Pending</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-100">{stats?.pending_count || 0}</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <span className="text-slate-400 text-sm">Overdue</span>
                    </div>
                    <p className="text-3xl font-bold text-red-400">{stats?.overdue_count || 0}</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-slate-400 text-sm">Avg Cycle</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-100">{stats?.avg_cycle_hours || 0}<span className="text-lg text-slate-400">h</span></p>
                </div>
            </div>

            {/* By Entity Type */}
            {stats && Object.keys(stats.by_entity_type || {}).length > 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart2 className="w-4 h-4 text-slate-400" />
                        <h2 className="text-slate-100 font-medium">Completed by Entity Type</h2>
                    </div>
                    <div className="space-y-3">
                        {Object.entries(stats.by_entity_type).map(([type, count]) => (
                            <div key={type} className="flex items-center gap-3">
                                <span className="text-slate-400 text-sm w-32 truncate">{type}</span>
                                <div className="flex-1 bg-slate-800 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(count / maxByEntityType) * 100}%` }} />
                                </div>
                                <span className="text-slate-300 text-sm w-8 text-right">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Pending */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-slate-100 font-medium">Recent Pending</h2>
                    <button onClick={() => navigate('/flow/approvals/pending')} className="text-blue-400 hover:text-blue-300 text-sm">View All →</button>
                </div>
                {recentApprovals.length === 0 ? (
                    <p className="text-slate-500 text-sm">No pending approvals</p>
                ) : (
                    <div className="space-y-2">
                        {recentApprovals.slice(0, 5).map(a => (
                            <div key={a.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                                <div>
                                    <span className="text-slate-300 text-sm">{a.entity_data?.name || a.entity_data?.title || `${a.entity_type} #${a.entity_id?.slice(0, 8)}`}</span>
                                    <span className="text-slate-500 text-xs ml-2">{a.time_elapsed_hours}h elapsed</span>
                                </div>
                                {a.is_overdue && <span className="text-red-400 text-xs">OVERDUE</span>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
