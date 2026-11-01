import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../services/flowApi', () => ({
    flowApi: {
        getAutomationRules: vi.fn(), setAutomationRuleEnabled: vi.fn(), deleteAutomationRule: vi.fn(),
    },
}));

let shellState: any;
vi.mock('@so360/shell-context', () => ({
    useShellBridge: () => shellState,
}));

import { AutomationRulesPage } from '../pages/AutomationRulesPage';
import { flowApi } from '../services/flowApi';

const api = flowApi as any;
const rule = { id: 'r1', name: 'Welcome leads', is_enabled: true, trigger_type: 'event', trigger_config: { event_types: ['crm.lead.created'] }, conditions: null, actions: [{ type: 'core.send_email', config: {} }] };

const renderPage = () => render(<MemoryRouter><AutomationRulesPage /></MemoryRouter>);

beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__confirmMock = vi.fn().mockResolvedValue(true);
    shellState = {
        effectiveFlagsLoaded: true, permissionsLoaded: true,
        isFeatureEnabled: () => true, hasPermission: () => true,
    };
    api.getAutomationRules.mockResolvedValue({ data: [rule] });
    api.setAutomationRuleEnabled.mockResolvedValue({ data: {} });
    api.deleteAutomationRule.mockResolvedValue({});
});

describe('AutomationRulesPage', () => {
    it('Given rules exist, When the page loads, Then each rule is listed with its trigger summary', async () => {
        renderPage();
        expect(await screen.findByText('Welcome leads')).toBeInTheDocument();
        expect(screen.getByText('crm.lead.created')).toBeInTheDocument();
        expect(screen.getAllByText('Enabled').length).toBeGreaterThan(1); // filter option + row badge
    });

    it('Given the feature flag is off, When the page renders, Then rules are not requested and a notice is shown', async () => {
        shellState.isFeatureEnabled = () => false;
        renderPage();
        expect(await screen.findByText('Automations are not available')).toBeInTheDocument();
        expect(api.getAutomationRules).not.toHaveBeenCalled();
    });

    it('Given the user may create rules, When New rule is clicked, Then it opens the editor', async () => {
        renderPage();
        fireEvent.click(await screen.findByText('New rule'));
        expect(mockNavigate).toHaveBeenCalledWith('/flow/automation/new');
    });

    it('Given the user lacks triggers.create, When the page loads, Then New rule is hidden', async () => {
        shellState.hasPermission = (c: string) => c !== 'triggers.create';
        renderPage();
        await screen.findByText('Welcome leads');
        expect(screen.queryByText('New rule')).not.toBeInTheDocument();
    });

    it('Given an enabled rule, When Disable is chosen, Then the disable endpoint is called and the list reloads', async () => {
        renderPage();
        fireEvent.click(await screen.findByText('Disable'));
        await waitFor(() => expect(api.setAutomationRuleEnabled).toHaveBeenCalledWith('r1', false));
        await waitFor(() => expect(api.getAutomationRules).toHaveBeenCalledTimes(2));
    });

    it('Given a rule, When Delete is confirmed, Then it is deleted', async () => {
        renderPage();
        fireEvent.click(await screen.findByText('Delete'));
        await waitFor(() => expect(api.deleteAutomationRule).toHaveBeenCalledWith('r1'));
    });

    it('Given a rule, When Delete is declined, Then nothing is deleted', async () => {
        (globalThis as any).__confirmMock = vi.fn().mockResolvedValue(false);
        renderPage();
        fireEvent.click(await screen.findByText('Delete'));
        await waitFor(() => expect((globalThis as any).__confirmMock).toHaveBeenCalled());
        expect(api.deleteAutomationRule).not.toHaveBeenCalled();
    });

    it('Given the API fails, When the page loads, Then an error with Retry is shown', async () => {
        api.getAutomationRules.mockRejectedValueOnce(new Error('boom'));
        renderPage();
        expect(await screen.findByText('Could not load automation rules.')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
    });
});
