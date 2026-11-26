import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { History, RefreshCw } from 'lucide-react';
import { useShellBridge } from '@so360/shell-context';
import {
    toast, Badge, DataTable, EmptyState, IconButton, ListPageTemplate, Pagination, type DataTableColumn,
} from '@so360/design-system';
import { flowApi } from '../services/flowApi';
import type { AutomationRun, RunStatus } from '../types/automation';

const PAGE_SIZE = 25;
const STATUSES: RunStatus[] = ['pending', 'scheduled', 'running', 'retrying', 'succeeded', 'failed', 'skipped', 'cancelled', 'dead'];
const RETRYABLE: RunStatus[] = ['failed', 'dead', 'cancelled'];
const TONE: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'neutral'> = {
    succeeded: 'success', failed: 'danger', dead: 'danger', retrying: 'warning', running: 'info', pending: 'info', scheduled: 'info', skipped: 'neutral', cancelled: 'neutral',
};

export const AutomationRunsPage = () => {
    const navigate = useNavigate();
    const shell = useShellBridge();
    const [params] = useSearchParams();
    const ruleId = params.get('rule_id') || undefined;
    const [runs, setRuns] = useState<AutomationRun[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);

    const featureOn = (shell?.effectiveFlagsLoaded !== false) && (shell?.isFeatureEnabled?.('submodule:flow:automation_rules') ?? true);
    const canRetry = featureOn && (shell?.permissionsLoaded === true) && (shell?.hasPermission?.('instances.retry') ?? false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await flowApi.getAutomationRuns({
                rule_id: ruleId, ...(status ? { status } : {}), limit: PAGE_SIZE, offset: page * PAGE_SIZE,
            });
            setRuns(res.data?.data || []);
            setTotal(res.data?.total || 0);
        } catch {
            setRuns([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [ruleId, status, page]);

    useEffect(() => { load(); }, [load]);

    const retry = async (run: AutomationRun) => {
        try {
            await flowApi.retryAutomationRun(run.id);
            toast.success('Run queued for retry');
            await load();
        } catch { /* Error toast comes from the flowApi interceptor. */ }
    };

    const columns: DataTableColumn<AutomationRun>[] = [
        { key: 'created_at', header: 'Started', render: (r) => <span className="text-fg-subtle">{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</span> },
        { key: 'event', header: 'Trigger', render: (r) => r.event_type || r.trigger_kind },
        { key: 'subject', header: 'Record', hideBelow: 'medium', render: (r) => (r.subject_type ? `${r.subject_type} ${r.subject_id ?? ''}`.trim() : '') },
        { key: 'attempt', header: 'Attempts', align: 'right', render: (r) => `${r.attempt}/${r.max_attempts}` },
        { key: 'status', header: 'Status', render: (r) => <Badge tone={TONE[r.status] ?? 'neutral'} size="sm">{r.status}</Badge> },
        { key: 'error', header: 'Error', hideBelow: 'medium', render: (r) => <span className="text-danger truncate">{r.error ?? ''}</span> },
    ];

    return (
        <ListPageTemplate
            title="Automation run history"
            trail={[{ label: 'Automations', onClick: () => navigate('/flow/automation') }]}
            description={ruleId ? 'Runs for the selected rule.' : 'Every time an automation rule fired.'}
            count={loading ? undefined : total}
            filterConfig={{
                fields: [{ key: 'status', label: 'Status', type: 'select', options: STATUSES.map((s) => ({ value: s, label: s })) }],
                values: { status },
                onChange: (v) => { setPage(0); setStatus((v.status as string) || ''); },
                onClear: () => { setPage(0); setStatus(''); },
            }}
            toolbarEnd={<IconButton label="Refresh" icon={<RefreshCw className="w-5 h-5" />} onClick={load} disabled={loading} />}
            pagination={total > PAGE_SIZE ? (
                <Pagination currentPage={page + 1} totalPages={Math.ceil(total / PAGE_SIZE)} totalItems={total} pageSize={PAGE_SIZE} onPageChange={(p) => setPage(p - 1)} />
            ) : undefined}
        >
            <DataTable
                columns={columns}
                rows={runs}
                rowKey={(r) => r.id}
                loading={loading}
                rowActions={(r) => (canRetry && RETRYABLE.includes(r.status) ? [{ label: 'Retry', onSelect: () => retry(r) }] : [])}
                emptyState={<EmptyState icon={History} title="No runs yet" description="Runs appear here once a rule fires." />}
            />
        </ListPageTemplate>
    );
};
