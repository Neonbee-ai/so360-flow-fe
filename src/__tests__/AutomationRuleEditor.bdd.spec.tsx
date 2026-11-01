import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../services/flowApi', () => ({
    flowApi: {
        getAutomationCatalog: vi.fn(), getAutomationRule: vi.fn(), createAutomationRule: vi.fn(), updateAutomationRule: vi.fn(),
    },
}));

import { AutomationRuleEditor } from '../pages/AutomationRuleEditor';
import { flowApi } from '../services/flowApi';

const api = flowApi as any;
const catalog = {
    triggers: { kinds: [], events: [{ type: 'crm.lead.created', module: 'crm', live: true }] },
    actions: [{
        key: 'crm.create_task', label: 'Create task', module: 'crm', description: 'Creates a task', availability: 'ready',
        fields: [{ key: 'title', label: 'Title', type: 'string', required: true, templatable: true }],
    }],
    conditions: { operators: ['eq', 'exists'], groups: ['all', 'any'], paths: [] },
};

const renderAt = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes><Route path="/flow/automation/:ruleId" element={<AutomationRuleEditor />} /></Routes>
        </MemoryRouter>,
    );

beforeEach(() => {
    vi.clearAllMocks();
    api.getAutomationCatalog.mockResolvedValue({ data: catalog });
    api.createAutomationRule.mockResolvedValue({ data: {} });
    api.updateAutomationRule.mockResolvedValue({ data: {} });
});

describe('AutomationRuleEditor', () => {
    it('Given a new rule, When saved empty, Then validation errors show and nothing is posted', async () => {
        renderAt('/flow/automation/new');
        fireEvent.click(await screen.findByText('Save rule'));
        expect(await screen.findByText('Give the rule a name.')).toBeInTheDocument();
        expect(api.createAutomationRule).not.toHaveBeenCalled();
    });

    it('Given a filled-in new rule, When saved, Then the rule is created and the list opens', async () => {
        renderAt('/flow/automation/new');
        await screen.findByText('Save rule');
        fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'Task for new leads' } });
        fireEvent.change(screen.getByLabelText('Event'), { target: { value: 'crm.lead.created' } });
        fireEvent.click(screen.getByText('Add action'));
        fireEvent.change(screen.getByLabelText('Action 1'), { target: { value: 'crm.create_task' } });
        fireEvent.change(await screen.findByLabelText('Title *'), { target: { value: 'Call {{data.name}}' } });
        fireEvent.click(screen.getByText('Save rule'));
        await waitFor(() => expect(api.createAutomationRule).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Task for new leads', trigger_type: 'event', trigger_config: { event_types: ['crm.lead.created'] },
            conditions: null, actions: [{ type: 'crm.create_task', config: { title: 'Call {{data.name}}' } }],
        })));
        expect(mockNavigate).toHaveBeenCalledWith('/flow/automation');
    });

    it('Given an existing rule, When opened and saved, Then it is updated by id', async () => {
        api.getAutomationRule.mockResolvedValue({ data: {
            id: 'abc', name: 'Existing', is_enabled: true, trigger_type: 'event', trigger_config: { event_types: ['crm.lead.created'] },
            conditions: { field: 'data.score', op: 'eq', value: 5 }, actions: [{ type: 'crm.create_task', config: { title: 'Hi' } }],
        } });
        renderAt('/flow/automation/abc');
        expect(await screen.findByDisplayValue('Existing')).toBeInTheDocument();
        expect(screen.getByDisplayValue('data.score')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Save rule'));
        await waitFor(() => expect(api.updateAutomationRule).toHaveBeenCalledWith('abc', expect.objectContaining({
            conditions: { field: 'data.score', op: 'eq', value: 5 },
        })));
    });

    it('Given the schedule trigger, When selected, Then the interval field replaces the event picker', async () => {
        renderAt('/flow/automation/new');
        fireEvent.change(await screen.findByLabelText('Trigger'), { target: { value: 'schedule' } });
        expect(screen.getByLabelText('Run every (minutes) *')).toBeInTheDocument();
        expect(screen.queryByLabelText('Event')).not.toBeInTheDocument();
    });

    it('Given the catalog fails to load, When the page opens, Then an error is shown', async () => {
        api.getAutomationCatalog.mockRejectedValueOnce(new Error('x'));
        renderAt('/flow/automation/new');
        fireEvent.click(await screen.findByText('Save rule'));
        expect(await screen.findByText('Could not load the automation catalog.')).toBeInTheDocument();
    });
});
