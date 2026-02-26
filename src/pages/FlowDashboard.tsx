import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Workflow } from 'lucide-react';
import { flowApi } from '../services/flowApi';
import type { FlowDefinition } from '../types/flow';

export const FlowDashboard = () => {
    const navigate = useNavigate();
    const [flows, setFlows] = useState<FlowDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedModule, setSelectedModule] = useState<string>('');

    const modules = [
        { code: 'module:crm:lead', name: 'CRM - Leads' },
        { code: 'module:crm:deal', name: 'CRM - Deals' },
        { code: 'module:projects:task', name: 'Projects - Tasks' },
        { code: 'module:procurement:purchase_request', name: 'Procurement - PRs' },
        { code: 'module:timesheet:batch', name: 'Timesheet - Batches' },
        { code: 'module:accounting:expense', name: 'Accounting - Expenses' },
        { code: 'module:dailystore:order', name: 'Daily Store - Orders' },
        { code: 'module:fulfillment:order', name: 'Fulfillment - Orders' },
        { code: 'module:support:ticket', name: 'Support - Tickets' },
    ];

    useEffect(() => {
        loadFlows();
    }, [selectedModule]);

    const loadFlows = async () => {
        try {
            setLoading(true);
            const response = await flowApi.getFlowDefinitions(selectedModule || undefined);
            setFlows(response.data);
        } catch (error) {
            console.error('Failed to load flows:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                            <Workflow className="w-8 h-8 text-blue-500" />
                            Flow Definitions
                        </h1>
                        <p className="text-slate-400 mt-2">
                            Manage workflow definitions across all modules
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => navigate('/flow/simulator')}
                            className="px-4 py-2 bg-slate-800 text-slate-100 rounded-lg hover:bg-slate-700 flex items-center gap-2"
                        >
                            Simulator
                        </button>
                        <button
                            onClick={() => navigate('/flow/approvals/policies')}
                            className="px-4 py-2 bg-slate-800 text-slate-100 rounded-lg hover:bg-slate-700 flex items-center gap-2"
                        >
                            Approval Policies
                        </button>
                        <button
                            onClick={() => navigate('/flow/instances')}
                            className="px-4 py-2 bg-slate-800 text-slate-100 rounded-lg hover:bg-slate-700 flex items-center gap-2"
                        >
                            View Instances
                        </button>
                        <button
                            onClick={() => navigate('/flow/builder/new')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            New Flow
                        </button>
                    </div>
                </div>

                {/* Module Filter */}
                <div className="mb-6">
                    <label className="text-sm text-slate-400 mb-2 block">Filter by Module</label>
                    <select
                        value={selectedModule}
                        onChange={(e) => setSelectedModule(e.target.value)}
                        className="bg-slate-900/50 border border-slate-800 text-slate-100 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Modules</option>
                        {modules.map((mod) => (
                            <option key={mod.code} value={mod.code}>
                                {mod.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Flows Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                    </div>
                ) : flows.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-12 text-center">
                        <Workflow className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-400 text-lg">
                            {selectedModule ? 'No flows found for this module' : 'No flows created yet'}
                        </p>
                        <p className="text-slate-500 text-sm mt-2">
                            Create your first workflow to get started
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {flows.map((flow) => (
                            <div
                                key={flow.id}
                                onClick={() => navigate(`/flow/builder/${flow.id}`)}
                                className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 cursor-pointer hover:border-blue-500 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-100">
                                            {flow.name}
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {flow.module_code}
                                        </p>
                                    </div>
                                    <span
                                        className={`px-2 py-1 rounded text-xs ${
                                            flow.is_active
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-slate-700 text-slate-400'
                                        }`}
                                    >
                                        {flow.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                {flow.description && (
                                    <p className="text-sm text-slate-400 mb-4">{flow.description}</p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                    <span>{flow.states?.length || 0} states</span>
                                    <span>{flow.transitions?.length || 0} transitions</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
