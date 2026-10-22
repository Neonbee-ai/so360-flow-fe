import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/flowApi', () => ({ flowApi: { getAutomationRuns: vi.fn(), retryAutomationRun: vi.fn() } }));
let shellState: any;
vi.mock('@so360/shell-context', () => ({ useShellBridge: () => shellState }));

import { AutomationRunsPage } from '../pages/AutomationRunsPage';
import { flowApi } from '../services/flowApi';

const api = flowApi as any;
const run = (id: string, status: string) => ({ id, rule_id: 'r1', status, trigger_kind: 'event', event_type: 'crm.lead.created', attempt: 1, max_attempts: 5, error: status === 'failed' ? 'smtp down' : null });

beforeEach(() => {
    vi.clearAllMocks();
    shellState = { effectiveFlagsLoaded: true, permissionsLoaded: true, isFeatureEnabled: () => true, hasPermission: () => true };
    api.getAutomationRuns.mockResolvedValue({ data: { data: [run('a', 'failed'), run('b', 'succeeded')], total: 2, limit: 25, offset: 0 } });
    api.retryAutomationRun.mockResolvedValue({});
});

const renderPage = (url = '/flow/automation/runs?rule_id=r1') => render(<MemoryRouter initialEntries={[url]}><AutomationRunsPage /></MemoryRouter>);

describe('AutomationRunsPage', () => {
    it('Given a rule id in the URL, When the page loads, Then runs are requested for that rule', async () => {
        renderPage();
        expect(await screen.findByText('smtp down')).toBeInTheDocument();
        expect(api.getAutomationRuns).toHaveBeenCalledWith(expect.objectContaining({ rule_id: 'r1', limit: 25, offset: 0 }));
    });

    it('Given a failed and a succeeded run, When listed, Then only the failed run offers Retry', async () => {
        renderPage();
        await screen.findByText('smtp down');
        expect(screen.getAllByText('Retry')).toHaveLength(1);
    });

    it('Given a failed run, When Retry is clicked, Then the retry endpoint is called', async () => {
        renderPage();
        fireEvent.click(await screen.findByText('Retry'));
        await waitFor(() => expect(api.retryAutomationRun).toHaveBeenCalledWith('a'));
    });

    it('Given the user lacks instances.retry, When listed, Then Retry is hidden', async () => {
        shellState.hasPermission = () => false;
        renderPage();
        await screen.findByText('smtp down');
        expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('Given no runs, When the page loads, Then the empty state is shown', async () => {
        api.getAutomationRuns.mockResolvedValue({ data: { data: [], total: 0, limit: 25, offset: 0 } });
        renderPage();
        expect(await screen.findByText('No runs yet')).toBeInTheDocument();
    });
});
