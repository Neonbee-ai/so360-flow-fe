/**
 * flow-definition-actions.bdd.test.tsx
 * BDD specs: Flow Definitions edit / enable / disable / delete (dashboard row menu + builder header).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

let canUpdate = true;
vi.mock('@so360/shell-context', async () => {
  const base = await vi.importActual<any>('@so360/shell-context');
  return {
    ...base,
    useShellBridge: () => ({
      permissionsLoaded: true, effectiveFlagsLoaded: true, isFeatureEnabled: () => true, isFeatureHidden: () => false,
      hasPermission: (p: string) => (p === 'workflows.update' ? canUpdate : true),
      hasAnyPermission: () => true,
    }),
    useActivity: () => ({ recordActivity: async () => {} }),
  };
});

vi.mock('../services/flowApi', () => ({
  flowApi: {
    getFlowDefinitions: vi.fn(),
    getFlowDefinition: vi.fn(),
    setFlowActive: vi.fn(),
    deleteFlowDefinition: vi.fn(),
    updateFlowDefinition: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import { flowApi } from '../services/flowApi';
import { FlowDashboard } from '../pages/FlowDashboard';
import { FlowBuilder } from '../pages/FlowBuilder';

const api = flowApi as any;
const FLOW = {
  id: 'f1', name: 'Lead Flow', module_code: 'module:crm:lead', is_active: true,
  states: [{ code: 'new', name: 'New', is_initial: true }], transitions: [],
};

const renderDashboard = async () => {
  render(<MemoryRouter><FlowDashboard /></MemoryRouter>);
  await screen.findByText('Lead Flow');
};
const openRowMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Actions for Lead Flow' }));

describe('Given the Flow Definitions list', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    canUpdate = true;
    api.getFlowDefinitions.mockResolvedValue({ data: [FLOW] });
  });

  it('When loaded / Then disabled flows are requested too (include inactive)', async () => {
    await renderDashboard();
    expect(api.getFlowDefinitions).toHaveBeenCalledWith(undefined, { includeInactive: true });
  });

  it('When Edit is chosen / Then it opens the builder for that flow', async () => {
    await renderDashboard();
    openRowMenu();
    fireEvent.click(await screen.findByText('Edit'));
    expect(mockNavigate).toHaveBeenCalledWith('/flow/builder/f1');
  });

  it('When Disable is chosen / Then the badge flips at once and the API is called with is_active=false', async () => {
    api.setFlowActive.mockResolvedValue({ data: { ...FLOW, is_active: false } });
    await renderDashboard();
    openRowMenu();
    fireEvent.click(await screen.findByText('Disable'));
    await screen.findByText('Inactive');
    expect(api.setFlowActive).toHaveBeenCalledWith('f1', false);
  });

  it('When the toggle fails / Then the badge rolls back to Active', async () => {
    api.setFlowActive.mockRejectedValue(new Error('boom'));
    await renderDashboard();
    openRowMenu();
    fireEvent.click(await screen.findByText('Disable'));
    await waitFor(() => expect(screen.getByText('Active')).toBeInTheDocument());
  });

  it('When Delete is confirmed / Then the flow is deleted and the row disappears', async () => {
    api.deleteFlowDefinition.mockResolvedValue({ data: { deleted: true } });
    await renderDashboard();
    openRowMenu();
    fireEvent.click(await screen.findByText('Delete'));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete', hidden: false }));
    await waitFor(() => expect(api.deleteFlowDefinition).toHaveBeenCalledWith('f1'));
    await waitFor(() => expect(screen.queryByText('Lead Flow')).not.toBeInTheDocument());
  });

  it('When Delete returns 409 (live instances) / Then the row stays', async () => {
    api.deleteFlowDefinition.mockRejectedValue({ response: { status: 409 } });
    await renderDashboard();
    openRowMenu();
    fireEvent.click(await screen.findByText('Delete'));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete', hidden: false }));
    await waitFor(() => expect(api.deleteFlowDefinition).toHaveBeenCalled());
    expect(screen.getByText('Lead Flow')).toBeInTheDocument();
  });

  it('Given no workflows.update permission / Then no row actions menu is shown', async () => {
    canUpdate = false;
    await renderDashboard();
    expect(screen.queryByRole('button', { name: 'Actions for Lead Flow' })).not.toBeInTheDocument();
  });
});

describe('Given the Flow Builder for an existing flow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    canUpdate = true;
    api.getFlowDefinition.mockResolvedValue({ data: { ...FLOW, is_active: false } });
  });
  const renderBuilder = async () => {
    render(
      <MemoryRouter initialEntries={['/flow/builder/f1']}>
        <Routes><Route path="/flow/builder/:flowId" element={<FlowBuilder />} /></Routes>
      </MemoryRouter>,
    );
    await screen.findByDisplayValue('Lead Flow');
  };

  it('When opened / Then a disabled flow loads (include inactive) with the Active switch off', async () => {
    await renderBuilder();
    expect(api.getFlowDefinition).toHaveBeenCalledWith('f1', { includeInactive: true });
    expect(screen.getByRole('switch', { name: 'Active' })).not.toBeChecked();
  });

  it('When the Active switch is turned on / Then the flow is enabled via the API', async () => {
    api.setFlowActive.mockResolvedValue({ data: FLOW });
    await renderBuilder();
    fireEvent.click(screen.getByRole('switch', { name: 'Active' }));
    await waitFor(() => expect(api.setFlowActive).toHaveBeenCalledWith('f1', true));
  });

  it('When Delete is confirmed / Then the flow is deleted and the user returns to the list', async () => {
    api.deleteFlowDefinition.mockResolvedValue({ data: { deleted: true } });
    await renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const buttons = await screen.findAllByRole('button', { name: 'Delete' });
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(api.deleteFlowDefinition).toHaveBeenCalledWith('f1'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/flow'));
  });

  it('When Remove state is clicked / Then the state is removed', async () => {
    await renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: 'Remove state' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Remove state' })).not.toBeInTheDocument());
  });

  it('Given no workflows.update permission / Then Active switch and Delete are hidden', async () => {
    canUpdate = false;
    await renderBuilder();
    expect(screen.queryByRole('switch', { name: 'Active' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });
});
