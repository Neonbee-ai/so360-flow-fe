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
    getAllInstances: vi.fn(),
  },
}));

vi.mock('@so360/shell-context', () => ({
  useSandboxLimit: () => ({ isSandboxMode: false, sandboxEntryLimit: 5, limitItems: (items: any[]) => items, isLimited: () => false }),
}));

import { InstanceList } from '../pages/InstanceList';
import { flowApi } from '../services/flowApi';

const mockFlowApi = flowApi as any;

const renderPage = () =>
  render(<MemoryRouter><InstanceList /></MemoryRouter>);

beforeEach(() => vi.resetAllMocks());

describe('InstanceList', () => {
  describe('Given instances are loaded', () => {
    beforeEach(() => {
      mockFlowApi.getAllInstances.mockResolvedValue({
        data: {
          data: [
            { id: 'inst-1', current_state: 'draft', entity_type: 'lead', entity_id: 'lead-1', started_at: '2026-01-10T10:00:00Z', completed_at: null, flows: { name: 'Lead Flow', module_code: 'module:crm:lead', states: [{ code: 'draft', name: 'Draft' }] } },
            { id: 'inst-2', current_state: 'approved', entity_type: 'expense', entity_id: 'exp-1', started_at: '2026-01-08T10:00:00Z', completed_at: '2026-01-09T15:00:00Z', flows: { name: 'Expense Flow', module_code: 'module:accounting:expense', states: [{ code: 'approved', name: 'Approved' }] } },
          ],
          total: 2,
        },
      });
    });

    it('When the page loads / Then it shows the Flow Instances header', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Flow Instances')).toBeInTheDocument());
    });

    it('When the page loads / Then it shows instance count', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('2 workflow instances across your organization')).toBeInTheDocument());
    });

    it('When the page loads / Then it shows flow names', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Lead Flow')).toBeInTheDocument());
      expect(screen.getByText('Expense Flow')).toBeInTheDocument();
    });

    it('When the page loads / Then completed instances show Completed badge', async () => {
      renderPage();
      await waitFor(() => expect(screen.getAllByText('Completed').length).toBeGreaterThan(0));
    });

    it('When the page loads / Then active instances show Active badge', async () => {
      renderPage();
      await waitFor(() => expect(screen.getAllByText('Active').length).toBeGreaterThan(0));
    });

    it('When a status filter is clicked / Then instances are re-fetched', async () => {
      renderPage();
      await waitFor(() => expect(mockFlowApi.getAllInstances).toHaveBeenCalledTimes(1));
      fireEvent.click(screen.getByText('completed'));
      await waitFor(() => expect(mockFlowApi.getAllInstances).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' })));
    });

    it('When the View button is clicked / Then it navigates to the instance viewer', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Lead Flow')).toBeInTheDocument());
      const viewBtns = screen.getAllByText('View');
      fireEvent.click(viewBtns[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/flow/instance/inst-1');
    });
  });

  describe('Given no instances exist', () => {
    beforeEach(() => {
      mockFlowApi.getAllInstances.mockResolvedValue({ data: { data: [], total: 0 } });
    });

    it('When the page loads / Then the empty state is shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('No flow instances found')).toBeInTheDocument());
    });
  });

  describe('Given an API error occurs', () => {
    beforeEach(() => {
      mockFlowApi.getAllInstances.mockRejectedValue({ response: { data: { message: 'Server error' } } });
    });

    it('When the page loads / Then the error is displayed with retry', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });
});
