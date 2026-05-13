import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

const approvalWithDelegate = {
  id: 'ap1',
  entity_type: 'lead',
  entity_id: 'lead-abcd1234',
  status: 'pending',
  is_overdue: false,
  time_elapsed_hours: 2,
  sla_hours: 8,
  requested_at: '2026-01-10T10:00:00Z',
  entity_data: { name: 'Test Lead' },
  current_step: { id: 'step1', can_delegate: true },
};

const approvalOverdue = {
  id: 'ap2',
  entity_type: 'expense',
  entity_id: 'exp-efgh5678',
  status: 'pending',
  is_overdue: true,
  time_elapsed_hours: 12,
  sla_hours: 8,
  requested_at: '2026-01-09T08:00:00Z',
  entity_data: {},
  current_step: { id: 'step2', can_delegate: false },
};

beforeEach(() => vi.resetAllMocks());

describe('PendingApprovals', () => {
  describe('Given pending approvals exist', () => {
    beforeEach(() => {
      mockFlowApi.getPendingApprovals.mockResolvedValue({
        data: [approvalWithDelegate, approvalOverdue],
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

    it('When the page loads / Then entity data details are displayed', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('name:')).toBeInTheDocument());
      expect(screen.getByText('Test Lead')).toBeInTheDocument();
    });

    it('When the page loads / Then time elapsed and SLA info is displayed for each approval', async () => {
      renderPage();
      await waitFor(() => expect(screen.getAllByText(/elapsed/).length).toBe(2));
    });

    it('When Approve is clicked and confirmed / Then performApprovalAction is called with APPROVE', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockFlowApi.performApprovalAction.mockResolvedValue({ data: {} });
      renderPage();
      await waitFor(() => screen.getAllByText('Approve'));
      fireEvent.click(screen.getAllByText('Approve')[0]);
      await waitFor(() =>
        expect(mockFlowApi.performApprovalAction).toHaveBeenCalledWith({
          approval_instance_id: 'ap1',
          step_id: 'step1',
          action: 'APPROVE',
          comment: 'Approved via UI',
        })
      );
    });

    it('When Approve is clicked and cancelled / Then performApprovalAction is NOT called', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderPage();
      await waitFor(() => screen.getAllByText('Approve'));
      fireEvent.click(screen.getAllByText('Approve')[0]);
      expect(mockFlowApi.performApprovalAction).not.toHaveBeenCalled();
    });

    it('When Approve fails / Then an alert is shown with error message', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockFlowApi.performApprovalAction.mockRejectedValue(new Error('Server error'));
      renderPage();
      await waitFor(() => screen.getAllByText('Approve'));
      fireEvent.click(screen.getAllByText('Approve')[0]);
      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith('Failed to approve: Server error')
      );
    });

    it('When Reject is clicked with a reason / Then performApprovalAction is called with REJECT', async () => {
      vi.spyOn(window, 'prompt').mockReturnValue('Not valid');
      mockFlowApi.performApprovalAction.mockResolvedValue({ data: {} });
      renderPage();
      await waitFor(() => screen.getAllByText('Reject'));
      fireEvent.click(screen.getAllByText('Reject')[0]);
      await waitFor(() =>
        expect(mockFlowApi.performApprovalAction).toHaveBeenCalledWith({
          approval_instance_id: 'ap1',
          step_id: 'step1',
          action: 'REJECT',
          comment: 'Not valid',
        })
      );
    });

    it('When Reject is clicked and prompt is cancelled / Then performApprovalAction is NOT called', async () => {
      vi.spyOn(window, 'prompt').mockReturnValue(null);
      renderPage();
      await waitFor(() => screen.getAllByText('Reject'));
      fireEvent.click(screen.getAllByText('Reject')[0]);
      expect(mockFlowApi.performApprovalAction).not.toHaveBeenCalled();
    });

    it('When Reject fails / Then an alert is shown with error message', async () => {
      vi.spyOn(window, 'prompt').mockReturnValue('Bad');
      vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockFlowApi.performApprovalAction.mockRejectedValue(new Error('Reject failed'));
      renderPage();
      await waitFor(() => screen.getAllByText('Reject'));
      fireEvent.click(screen.getAllByText('Reject')[0]);
      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith('Failed to reject: Reject failed')
      );
    });

    it('When Delegate is clicked with userId and reason / Then performApprovalAction is called with DELEGATE', async () => {
      let promptCall = 0;
      vi.spyOn(window, 'prompt').mockImplementation(() => {
        promptCall++;
        return promptCall === 1 ? 'user-99' : 'Vacation coverage';
      });
      mockFlowApi.performApprovalAction.mockResolvedValue({ data: {} });
      renderPage();
      await waitFor(() => screen.getByText('Delegate'));
      fireEvent.click(screen.getByText('Delegate'));
      await waitFor(() =>
        expect(mockFlowApi.performApprovalAction).toHaveBeenCalledWith({
          approval_instance_id: 'ap1',
          step_id: 'step1',
          action: 'DELEGATE',
          comment: 'Vacation coverage',
          delegate_to_user_id: 'user-99',
        })
      );
    });

    it('When Delegate prompt is cancelled / Then performApprovalAction is NOT called', async () => {
      vi.spyOn(window, 'prompt').mockReturnValue(null);
      renderPage();
      await waitFor(() => screen.getByText('Delegate'));
      fireEvent.click(screen.getByText('Delegate'));
      expect(mockFlowApi.performApprovalAction).not.toHaveBeenCalled();
    });

    it('When Delegate fails / Then an alert is shown with error message', async () => {
      let promptCall = 0;
      vi.spyOn(window, 'prompt').mockImplementation(() => {
        promptCall++;
        return promptCall === 1 ? 'user-99' : 'Reason';
      });
      vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockFlowApi.performApprovalAction.mockRejectedValue(new Error('Delegate failed'));
      renderPage();
      await waitFor(() => screen.getByText('Delegate'));
      fireEvent.click(screen.getByText('Delegate'));
      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith('Failed to delegate: Delegate failed')
      );
    });
  });

  describe('Given a single approval exists', () => {
    beforeEach(() => {
      mockFlowApi.getPendingApprovals.mockResolvedValue({
        data: [approvalWithDelegate],
      });
    });

    it('When the count is 1 / Then it shows singular "approval"', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('1 approval awaiting your action')).toBeInTheDocument());
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

    it('When Retry is clicked / Then fetchPendingApprovals is called again', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Retry'));
      expect(mockFlowApi.getPendingApprovals).toHaveBeenCalledTimes(1);
      mockFlowApi.getPendingApprovals.mockResolvedValueOnce({ data: [] });
      fireEvent.click(screen.getByText('Retry'));
      await waitFor(() => expect(mockFlowApi.getPendingApprovals).toHaveBeenCalledTimes(2));
    });
  });
});
