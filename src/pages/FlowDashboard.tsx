import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, DataTable, EmptyState, ListPageTemplate, type DataTableColumn, type MenuItem } from '@so360/design-system';
import { Plus, Workflow } from 'lucide-react';
import { useShellBridge } from '@so360/shell-context';
import { flowApi } from '../services/flowApi';
import type { FlowDefinition } from '../types/flow';

export const FlowDashboard = () => {
    const navigate = useNavigate();
    const shell = useShellBridge();
    const canAccessAutomation = (shell?.effectiveFlagsLoaded !== false) && (shell?.isFeatureEnabled?.('submodule:flow:automation_rules') ?? false);
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

    const columns: DataTableColumn<FlowDefinition>[] = [
        {
            key: 'name',
            header: 'Flow',
            render: (flow) => (
                <div className="min-w-0">
                    <div className="font-medium text-fg truncate">{flow.name}</div>
                    {flow.description && <div className="text-xs text-fg-muted truncate">{flow.description}</div>}
                </div>
            ),
        },
        { key: 'module_code', header: 'Module', hideBelow: 'medium', render: (flow) => <span className="text-fg-subtle">{flow.module_code}</span> },
        { key: 'states', header: 'States', align: 'right', render: (flow) => `${flow.states?.length || 0} states` },
        { key: 'transitions', header: 'Transitions', align: 'right', render: (flow) => `${flow.transitions?.length || 0} transitions` },
        {
            key: 'status',
            header: 'Status',
            render: (flow) => <Badge tone={flow.is_active ? 'success' : 'neutral'} size="sm">{flow.is_active ? 'Active' : 'Inactive'}</Badge>,
        },
    ];

    const overflowActions: MenuItem[] = [
        { label: 'Simulator', onSelect: () => navigate('/flow/simulator') },
        { label: 'Approval Dashboard', onSelect: () => navigate('/flow/approvals/dashboard') },
        { label: 'Pending Approvals', onSelect: () => navigate('/flow/approvals/pending') },
        ...(canAccessPolicies ? [{ label: 'Approval Policies', onSelect: () => navigate('/flow/approvals/policies') }] : []),
        ...(canAccessAutomation ? [{ label: 'Automations', onSelect: () => navigate('/flow/automation') }] : []),
        { label: 'View Instances', onSelect: () => navigate('/flow/instances') },
    ];

    return (
        <ListPageTemplate
            title="Flow Definitions"
            description="Manage workflow definitions across all modules"
            count={loading ? undefined : flows.length}
            primaryAction={
                canCreateFlow ? (
                    <Button onClick={() => navigate('/flow/builder/new')}>
                        <Plus className="w-4 h-4" />
                        New Flow
                    </Button>
                ) : undefined
            }
            overflowActions={overflowActions}
            filterConfig={{
                fields: [
                    {
                        key: 'module',
                        label: 'Module',
                        type: 'select',
                        quick: true,
                        options: modules.map((mod) => ({ value: mod.code, label: mod.name })),
                    },
                ],
                values: { module: selectedModule },
                onChange: (values) => setSelectedModule((values.module as string) || ''),
                onClear: () => setSelectedModule(''),
            }}
            loading={loading}
        >
            <DataTable
                columns={columns}
                rows={flows}
                rowKey={(flow) => flow.id}
                loading={loading}
                onRowClick={(flow) => navigate(`/flow/builder/${flow.id}`)}
                emptyState={
                    <EmptyState
                        icon={Workflow}
                        title={selectedModule ? 'No flows found for this module' : 'No flows created yet'}
                        description="Create your first workflow to get started"
                    />
                }
            />
        </ListPageTemplate>
    );
};
