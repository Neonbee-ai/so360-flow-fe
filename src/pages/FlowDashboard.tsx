import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Button, Grid, GridItem } from '@so360/design-system';
import { Plus, Workflow } from 'lucide-react';
import { useShellBridge } from '@so360/shell-context';
import { flowApi } from '../services/flowApi';
import type { FlowDefinition } from '../types/flow';

export const FlowDashboard = () => {
    const navigate = useNavigate();
    const shell = useShellBridge();
    const canCreateFlow = (shell?.permissionsLoaded === true) && (shell?.hasPermission?.('workflows.create') ?? false) && (shell?.effectiveFlagsLoaded !== false) && (shell?.isFeatureEnabled?.('action:flow:definitions:create') ?? true);
    const canStartInstance = (shell?.effectiveFlagsLoaded !== false) && (shell?.isFeatureEnabled?.('action:flow:instances:start') ?? true);
    const canAccessBuilder = (shell?.effectiveFlagsLoaded !== false) && (shell?.isFeatureEnabled?.('submodule:flow:builder') ?? true);
    const canAccessPolicies = (shell?.effectiveFlagsLoaded !== false) && (shell?.isFeatureEnabled?.('submodule:flow:approval_policies') ?? true);
    const [flows, setFlows] = useState<FlowDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedModule, setSelectedModule] = useState<string>('');

    const modules = [
        { code: 'module:crm:lead', name: 'CRM - Leads' },
        { code: 'module:crm:deal', name: 'CRM - Deals' },
        { code: 'module:projects:task', name: 'Projects - Tasks' },
        { code: 'module:projects:project', name: 'Projects - Projects' },
        { code: 'module:projects:stages', name: 'Projects - Stages' },
        { code: 'module:procurement:pr', name: 'Procurement - PRs' },
        { code: 'module:procurement:po', name: 'Procurement - POs' },
        { code: 'module:timesheet:batch', name: 'Timesheet - Batches' },
        { code: 'module:accounting:expense', name: 'Accounting - Expenses' },
        { code: 'module:accounting:invoice', name: 'Accounting - Invoices' },
        { code: 'module:dailystore:order', name: 'Daily Store - Orders' },
        { code: 'module:fulfillment:order', name: 'Fulfillment - Orders' },
        { code: 'module:inbox:conversation', name: 'Inbox - Conversations' },
        { code: 'module:inventory:item', name: 'Inventory - Items' },
        { code: 'module:people:leave', name: 'People Connect - Leave Requests' },
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
        <div className="min-h-screen bg-bg p-6">
            <div>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-fg flex items-center gap-3">
                            <Workflow className="w-8 h-8 text-primary" />
                            Flow Definitions
                        </h1>
                        <p className="text-fg-muted mt-2">
                            Manage workflow definitions across all modules
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => navigate('/flow/simulator')}>Simulator</Button>
                        <Button variant="secondary" onClick={() => navigate('/flow/approvals/dashboard')}>Approval Dashboard</Button>
                        <Button variant="secondary" onClick={() => navigate('/flow/approvals/pending')}>Pending Approvals</Button>
                        {canAccessPolicies && (
                            <Button variant="secondary" onClick={() => navigate('/flow/approvals/policies')}>Approval Policies</Button>
                        )}
                        <Button variant="secondary" onClick={() => navigate('/flow/instances')}>View Instances</Button>
                        {canCreateFlow && (
                            <Button onClick={() => navigate('/flow/builder/new')}>
                                <Plus className="w-5 h-5" />
                                New Flow
                            </Button>
                        )}
                    </div>
                </div>

                {/* Module Filter */}
                <div className="mb-6">
                    <label className="text-sm text-fg-muted mb-2 block">Filter by Module</label>
                    <Select
                        name="module-filter"
                        value={selectedModule}
                        onChange={(e) => setSelectedModule(e.target.value)}
                        options={[{ value: '', label: 'All Modules' }, ...modules.map((mod) => ({ value: mod.code, label: mod.name }))]}
                    />
                </div>

                {/* Flows Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                    </div>
                ) : flows.length === 0 ? (
                    <div className="bg-surface/50 border border-line rounded-lg p-12 text-center">
                        <Workflow className="w-16 h-16 text-fg-muted mx-auto mb-4" />
                        <p className="text-fg-muted text-lg">
                            {selectedModule ? 'No flows found for this module' : 'No flows created yet'}
                        </p>
                        <p className="text-fg-subtle text-sm mt-2">
                            Create your first workflow to get started
                        </p>
                    </div>
                ) : (
                    <Grid columns="auto" gap="lg">
                        {flows.map((flow) => (
                            <GridItem key={flow.id} span={4}>
                            <div
                                onClick={() => navigate(`/flow/builder/${flow.id}`)}
                                className="bg-surface/50 border border-line rounded-lg p-6 cursor-pointer hover:border-primary transition-colors"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-fg">
                                            {flow.name}
                                        </h3>
                                        <p className="text-sm text-fg-subtle mt-1">
                                            {flow.module_code}
                                        </p>
                                    </div>
                                    <span
                                        className={`px-2 py-1 rounded text-xs ${
                                            flow.is_active
                                                ? 'bg-success/20 text-success'
                                                : 'bg-line text-fg-muted'
                                        }`}
                                    >
                                        {flow.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                {flow.description && (
                                    <p className="text-sm text-fg-muted mb-4">{flow.description}</p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-fg-subtle">
                                    <span>{flow.states?.length || 0} states</span>
                                    <span>{flow.transitions?.length || 0} transitions</span>
                                </div>
                            </div>
                            </GridItem>
                        ))}
                    </Grid>
                )}
            </div>
        </div>
    );
};
