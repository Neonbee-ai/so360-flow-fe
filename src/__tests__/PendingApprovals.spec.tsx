import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/flowApi', () => ({
  flowApi: {
    getPendingApprovals: vi.fn(),
    performApprovalAction: vi.fn(),
  },
}));

import { PendingApprovals } from '../pages/PendingApprovals';
import { flowApi } from '../services/flowApi';

const mockFlowApi = flowApi as any;

const renderPage = () =>
  render(<MemoryRouter><PendingApprovals /></MemoryRouter>);

beforeEach(() => vi.resetAllMocks());

describe('PendingApprovals', () => {
  describe('Given pending approvals exist', () => {
    beforeEach(() => {
      mockFlowApi.getPendingApprovals.mockResolvedValue({
        data: [
          { id: 'ap1', entity_type: 'lead', entity_id: 'lead-abcd1234', status: 'pending', is_overdue: false, time_elapsed_hours: 2, sla_hours: 8, requested_at: '2026-01-10T10:00:00Z', entity_data: { name: 'Test Lead' }, current_step: { id: 'step1', can_delegate: true } },
          { id: 'ap2', entity_type: 'expense', entity_id: 'exp-efgh5678', status: 'pending', is_overdue: true, time_elapsed_hours: 12, sla_hours: 8, requested_at: '2026-01-09T08:00:00Z', entity_data: {}, current_step: { id: 'step2', can_delegate: false } },
        ],
      });
    });

    it('When the page loads / Then it shows the Pending Approvals header', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Pending Approvals')).toBeInTheDocument());
    });

    it('When the page loads / Then it shows the approval count', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('2 approvals awaiting your action')).toBeInTheDocument());
    });

    it('When the page loads / Then it shows entity type labels', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('lead #lead-abc')).toBeInTheDocument());
    });

    it('When an approval is overdue / Then the OVERDUE badge is shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('OVERDUE')).toBeInTheDocument());
    });

    it('When an approval is overdue / Then an SLA warning is shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText(/exceeded its SLA/)).toBeInTheDocument());
    });

    it('When delegation is allowed / Then the Delegate button is shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Delegate')).toBeInTheDocument());
    });

    it('When the page loads / Then Approve and Reject buttons are shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getAllByText('Approve').length).toBe(2));
      expect(screen.getAllByText('Reject').length).toBe(2);
    });
  });

  describe('Given no pending approvals exist', () => {
    beforeEach(() => {
      mockFlowApi.getPendingApprovals.mockResolvedValue({ data: [] });
    });

    it('When the page loads / Then the all-caught-up state is shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('All Caught Up!')).toBeInTheDocument());
    });
  });

  describe('Given the API fails', () => {
    beforeEach(() => {
      mockFlowApi.getPendingApprovals.mockRejectedValue(new Error('Network error'));
    });

    it('When the page loads / Then the error is displayed', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
    });
  });
});
