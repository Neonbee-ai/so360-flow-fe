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
    getFlowDefinitions: vi.fn(),
  },
}));

import { FlowDashboard } from '../pages/FlowDashboard';
import { flowApi } from '../services/flowApi';

const mockFlowApi = flowApi as any;

const renderPage = () =>
  render(<MemoryRouter><FlowDashboard /></MemoryRouter>);

beforeEach(() => vi.resetAllMocks());

describe('FlowDashboard', () => {
  describe('Given flows are loaded', () => {
    beforeEach(() => {
      mockFlowApi.getFlowDefinitions.mockResolvedValue({
        data: [
          { id: 'f1', name: 'Lead Approval', module_code: 'module:crm:lead', is_active: true, description: 'Approve new leads', states: [{ code: 'draft' }, { code: 'approved' }], transitions: [{ code: 'submit' }] },
          { id: 'f2', name: 'Expense Flow', module_code: 'module:accounting:expense', is_active: false, description: null, states: [{ code: 'open' }], transitions: [] },
        ],
      });
    });

    it('When the page loads / Then it shows the Flow Definitions header', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Flow Definitions')).toBeInTheDocument());
    });

    it('When the page loads / Then it shows flow cards', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Lead Approval')).toBeInTheDocument());
      expect(screen.getByText('Expense Flow')).toBeInTheDocument();
    });

    it('When the page loads / Then it shows active/inactive badges', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Active')).toBeInTheDocument());
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('When the page loads / Then it shows state and transition counts', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('2 states')).toBeInTheDocument());
      expect(screen.getByText('1 transitions')).toBeInTheDocument();
    });

    it('When a flow card is clicked / Then it navigates to the builder', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Lead Approval')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Lead Approval'));
      expect(mockNavigate).toHaveBeenCalledWith('/flow/builder/f1');
    });

    it('When the module filter is changed / Then flows are re-fetched', async () => {
      renderPage();
      await waitFor(() => expect(mockFlowApi.getFlowDefinitions).toHaveBeenCalledTimes(1));
      fireEvent.change(screen.getByDisplayValue('All Modules'), { target: { value: 'module:crm:lead' } });
      await waitFor(() => expect(mockFlowApi.getFlowDefinitions).toHaveBeenCalledWith('module:crm:lead'));
    });

    it('When the New Flow button is clicked / Then it navigates to the new builder', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Lead Approval')).toBeInTheDocument());
      fireEvent.click(screen.getByText('New Flow'));
      expect(mockNavigate).toHaveBeenCalledWith('/flow/builder/new');
    });
  });

  describe('Given no flows exist', () => {
    beforeEach(() => {
      mockFlowApi.getFlowDefinitions.mockResolvedValue({ data: [] });
    });

    it('When the page loads / Then the empty state is shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('No flows created yet')).toBeInTheDocument());
    });
  });
});
