import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Zap } from 'lucide-react';
import { useShellBridge } from '@so360/shell-context';
import {
    toast, useConfirm, Badge, Button, DataTable, EmptyState, ListPageTemplate, type DataTableColumn,
} from '@so360/design-system';
import { flowApi } from '../services/flowApi';
import type { AutomationRule } from '../types/automation';
import { describeTrigger } from '../utils/automationRule';

const TRIGGER_LABEL: Record<string, string> = { event: 'Event', schedule: 'Schedule', relative_time: 'Date-based' };
const FEATURE_KEY = 'submodule:flow:automation_rules';

export const AutomationRulesPage = () => {
    const navigate = useNavigate();
    const shell = useShellBridge();
    const [confirm, confirmDialog] = useConfirm();
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState('');
    const [triggerType, setTriggerType] = useState('');

    const featureOn = (shell?.effectiveFlagsLoaded !== false) && (shell?.isFeatureEnabled?.(FEATURE_KEY) ?? true);
    const can = (code: string) => (shell?.permissionsLoaded === true) && (shell?.hasPermission?.(code) ?? false);
    const canCreate = featureOn && can('triggers.create');
    const canUpdate = featureOn && can('triggers.update');
    const canDelete = featureOn && can('triggers.delete');

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await flowApi.getAutomationRules({
                ...(status ? { enabled: status === 'on' } : {}),
                ...(triggerType ? { trigger_type: triggerType } : {}),
            });
            setRules(res.data || []);
        } catch {
            setRules([]);
            setError('Could not load automation rules.');
        } finally {
            setLoading(false);
        }
    }, [status, triggerType]);

    useEffect(() => { if (featureOn) load(); }, [load, featureOn]);

    const toggle = async (rule: AutomationRule) => {
        try {
            await flowApi.setAutomationRuleEnabled(rule.id, !rule.is_enabled);
            toast.success(rule.is_enabled ? 'Rule disabled' : 'Rule enabled');
            await load();
        } catch { /* Error toast comes from the flowApi interceptor. */ }
    };

    const remove = async (rule: AutomationRule) => {
        const ok = await confirm({
            title: 'Delete rule',
            message: `Delete "${rule.name}"? Its run history is kept.`,
            confirmLabel: 'Delete',
        });
        if (!ok) return;
        try {
            await flowApi.deleteAutomationRule(rule.id);
            toast.success('Rule deleted');
            await load();
        } catch { /* Error toast comes from the flowApi interceptor. */ }
    };

    const columns: DataTableColumn<AutomationRule>[] = [
        {
            key: 'name',
            header: 'Rule',
            render: (rule) => (
                <div className="min-w-0">
                    <div className="font-medium text-fg truncate">{rule.name}</div>
                    {rule.description && <div className="text-xs text-fg-muted truncate">{rule.description}</div>}
                </div>
            ),
        },
        { key: 'trigger', header: 'When', render: (rule) => <span className="text-fg-subtle">{describeTrigger(rule)}</span> },
        { key: 'type', header: 'Type', hideBelow: 'medium', render: (rule) => TRIGGER_LABEL[rule.trigger_type] ?? rule.trigger_type },
        { key: 'actions', header: 'Then', align: 'right', render: (rule) => `${rule.actions?.length || 0} action${(rule.actions?.length || 0) === 1 ? '' : 's'}` },
        {
            key: 'status',
            header: 'Status',
            render: (rule) => <Badge tone={rule.is_enabled ? 'success' : 'neutral'} size="sm">{rule.is_enabled ? 'Enabled' : 'Disabled'}</Badge>,
        },
    ];

    const rowActions = (rule: AutomationRule) => [
        ...(canUpdate ? [{ label: 'Edit', onSelect: () => navigate(`/flow/automation/${rule.id}`) }] : []),
        ...(canUpdate ? [{ label: rule.is_enabled ? 'Disable' : 'Enable', onSelect: () => toggle(rule) }] : []),
        { label: 'Run history', onSelect: () => navigate(`/flow/automation/runs?rule_id=${rule.id}`) },
        ...(canDelete ? [{ label: 'Delete', destructive: true, onSelect: () => remove(rule) }] : []),
    ];

    if (!featureOn) {
        return (
            <ListPageTemplate title="Automations" trail={[]}>
                <EmptyState icon={Zap} title="Automations are not available" description="This feature is not enabled for your organization." />
            </ListPageTemplate>
        );
    }

    return (
        <>
            <ListPageTemplate
                title="Automations"
                trail={[]}
                description="When something happens, do something automatically."
                count={loading ? undefined : rules.length}
                primaryAction={canCreate ? (
                    <Button onClick={() => navigate('/flow/automation/new')}>
                        <Plus className="w-4 h-4" />
                        New rule
                    </Button>
                ) : undefined}
                overflowActions={[{ label: 'Run history', onSelect: () => navigate('/flow/automation/runs') }]}
                filterConfig={{
                    fields: [
                        { key: 'status', label: 'Status', type: 'select', options: [{ value: 'on', label: 'Enabled' }, { value: 'off', label: 'Disabled' }] },
                        { key: 'trigger_type', label: 'Type', type: 'select', options: Object.entries(TRIGGER_LABEL).map(([value, label]) => ({ value, label })) },
                    ],
                    values: { status, trigger_type: triggerType },
                    onChange: (v) => { setStatus((v.status as string) || ''); setTriggerType((v.trigger_type as string) || ''); },
                    onClear: () => { setStatus(''); setTriggerType(''); },
                }}
            >
                {error && (
                    <div className="mb-4 flex items-center justify-between rounded-lg border border-danger/30 bg-danger-container/20 p-4">
                        <p className="text-danger">{error}</p>
                        <Button variant="secondary" size="sm" onClick={load}>Retry</Button>
                    </div>
                )}
                <DataTable
                    columns={columns}
                    rows={rules}
                    rowKey={(rule) => rule.id}
                    loading={loading}
                    rowActions={rowActions}
                    onRowClick={canUpdate ? (rule) => navigate(`/flow/automation/${rule.id}`) : undefined}
                    emptyState={
                        <EmptyState
                            icon={Zap}
                            title="No automation rules yet"
                            description="Create a rule to send an email, create a task or assign an owner when something happens."
                        />
                    }
                />
            </ListPageTemplate>
            {confirmDialog}
        </>
    );
};
