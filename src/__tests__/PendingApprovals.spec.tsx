import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/flowApi', () => ({
  flowApi: {
    getPendingApprovals: vi.fn(),
    performApprovalAction: vi.fn(),
  },
}));

let mockShellBridgeValue: any = { effectiveFlagsLoaded: true, isFeatureEnabled: () => true };
vi.mock('@so360/shell-context', async () => {
  const actual = await vi.importActual('@so360/shell-context');
  return {
    ...actual,
    useShellBridge: () => mockShellBridgeValue,
    useActivity: () => ({ recordActivity: async () => {} }),
  };
});

vi.mock('../utils/formatters', () => ({
  useFlowFormatters: () => ({
    formatDate: (d: string, _opts?: any) => d ?? '',
    formatDateTime: (d: string) => d ?? '',
    formatCurrency: (v: number) => `$${v}`,
    formatNumber: (n: number) => String(n),
    currency: 'USD',
    locale: 'en-US',
    timezone: 'UTC',
  }),
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
  current_step: { id: 'step1', step_order: 1, can_delegate: true },
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
  current_step: { id: 'step2', step_order: 1, can_delegate: false },
};

beforeEach(() => {
  vi.resetAllMocks();
  mockShellBridgeValue = { effectiveFlagsLoaded: true, isFeatureEnabled: () => true };
});

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

    it('When the page loads / Then entity title from entity_data.name is shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getAllByText('Test Lead')[0]).toBeInTheDocument());
    });

    it('When the page loads / Then entity type fallback uses entity_id prefix', async () => {
      renderPage();
      // approvalOverdue has empty entity_data, so falls back to "expense #exp-efgh"
      await waitFor(() => expect(screen.getByText('expense #exp-efgh')).toBeInTheDocument());
    });

    it('When an approval is overdue / Then the OVERDUE badge is shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('OVERDUE')).toBeInTheDocument());
    });

    it('When an approval is overdue / Then an SLA warning is shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText(/exceeded its SLA/i)).toBeInTheDocument());
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
      await waitFor(() => expect(screen.getAllByText('Test Lead')[0]).toBeInTheDocument());
    });

    it('When the page loads / Then time elapsed info is displayed for each approval', async () => {
      renderPage();
      await waitFor(() => expect(screen.getAllByText(/elapsed/).length).toBe(2));
    });

    it('When Approve is clicked / Then the approve modal opens', async () => {
      renderPage();
      await waitFor(() => screen.getAllByText('Approve'));
      fireEvent.click(screen.getAllByText('Approve')[0]);
      await waitFor(() =>
        expect(screen.getByText(/Approve: Test Lead/)).toBeInTheDocument()
      );
    });

    it('When modal Approve is confirmed / Then performApprovalAction is called with APPROVE', async () => {
      mockFlowApi.performApprovalAction.mockResolvedValue({ data: {} });
      renderPage();
      await waitFor(() => screen.getAllByText('Approve'));
      // Open modal
      fireEvent.click(screen.getAllByText('Approve')[0]);
      await waitFor(() => screen.getByText(/Approve: Test Lead/));
      // Click approve in modal — modal renders first in DOM so index [0] is the modal button
      const approveButtons = screen.getAllByText('Approve');
      fireEvent.click(approveButtons[0]);
      await waitFor(() =>
        expect(mockFlowApi.performApprovalAction).toHaveBeenCalledWith({
          approval_instance_id: 'ap1',
          step_id: 'step1',
          action: 'APPROVE',
          comment: 'Approved',
        })
      );
    });

    it('When modal Cancel is clicked / Then performApprovalAction is NOT called', async () => {
      renderPage();
      await waitFor(() => screen.getAllByText('Approve'));
      fireEvent.click(screen.getAllByText('Approve')[0]);
      await waitFor(() => screen.getByText(/Approve: Test Lead/));
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockFlowApi.performApprovalAction).not.toHaveBeenCalled();
    });

    it('When Approve fails / Then an alert is shown with error message', async () => {
      vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockFlowApi.performApprovalAction.mockRejectedValue(new Error('Server error'));
      renderPage();
      await waitFor(() => screen.getAllByText('Approve'));
      fireEvent.click(screen.getAllByText('Approve')[0]);
      await waitFor(() => screen.getByText(/Approve: Test Lead/));
      const approveButtons = screen.getAllByText('Approve');
      fireEvent.click(approveButtons[0]);
      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith('Failed to approve: Server error')
      );
    });

    it('When Reject is clicked / Then the reject modal opens', async () => {
      renderPage();
      await waitFor(() => screen.getAllByText('Reject'));
      fireEvent.click(screen.getAllByText('Reject')[0]);
      await waitFor(() =>
        expect(screen.getByText(/Reject: Test Lead/)).toBeInTheDocument()
      );
    });

    it('When Reject modal is submitted with reason / Then performApprovalAction is called with REJECT', async () => {
      mockFlowApi.performApprovalAction.mockResolvedValue({ data: {} });
      renderPage();
      await waitFor(() => screen.getAllByText('Reject'));
      fireEvent.click(screen.getAllByText('Reject')[0]);
      await waitFor(() => screen.getByText(/Reject: Test Lead/));
      // Fill in comment (≥10 chars required)
      const textarea = screen.getByPlaceholderText(/Explain why/i);
      fireEvent.change(textarea, { target: { value: 'Not valid reason' } });
      const rejectButtons = screen.getAllByText('Reject');
      fireEvent.click(rejectButtons[0]);
      await waitFor(() =>
        expect(mockFlowApi.performApprovalAction).toHaveBeenCalledWith({
          approval_instance_id: 'ap1',
          step_id: 'step1',
          action: 'REJECT',
          comment: 'Not valid reason',
        })
      );
    });

    it('When Reject modal Cancel is clicked / Then performApprovalAction is NOT called', async () => {
      renderPage();
      await waitFor(() => screen.getAllByText('Reject'));
      fireEvent.click(screen.getAllByText('Reject')[0]);
      await waitFor(() => screen.getByText(/Reject: Test Lead/));
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockFlowApi.performApprovalAction).not.toHaveBeenCalled();
    });

    it('When Reject fails / Then an alert is shown with error message', async () => {
      vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockFlowApi.performApprovalAction.mockRejectedValue(new Error('Reject failed'));
      renderPage();
      await waitFor(() => screen.getAllByText('Reject'));
      fireEvent.click(screen.getAllByText('Reject')[0]);
      await waitFor(() => screen.getByText(/Reject: Test Lead/));
      const textarea = screen.getByPlaceholderText(/Explain why/i);
      fireEvent.change(textarea, { target: { value: 'Rejection reason here' } });
      const rejectButtons = screen.getAllByText('Reject');
      fireEvent.click(rejectButtons[0]);
      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith('Failed to reject: Reject failed')
      );
    });

    it('When Delegate is clicked / Then the delegate modal opens', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Delegate'));
      fireEvent.click(screen.getByText('Delegate'));
      await waitFor(() =>
        expect(screen.getByText(/Delegate: Test Lead/)).toBeInTheDocument()
      );
    });

    it('When Delegate modal is submitted / Then performApprovalAction is called with DELEGATE', async () => {
      mockFlowApi.performApprovalAction.mockResolvedValue({ data: {} });
      renderPage();
      await waitFor(() => screen.getByText('Delegate'));
      fireEvent.click(screen.getByText('Delegate'));
      await waitFor(() => screen.getByText(/Delegate: Test Lead/));
      fireEvent.change(screen.getByPlaceholderText(/Enter user UUID/i), { target: { value: 'user-99' } });
      fireEvent.change(screen.getByPlaceholderText(/Why are you delegating/i), { target: { value: 'Vacation coverage' } });
      const delegateButtons = screen.getAllByText('Delegate');
      fireEvent.click(delegateButtons[0]);
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

    it('When Delegate modal Cancel is clicked / Then performApprovalAction is NOT called', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Delegate'));
      fireEvent.click(screen.getByText('Delegate'));
      await waitFor(() => screen.getByText(/Delegate: Test Lead/));
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockFlowApi.performApprovalAction).not.toHaveBeenCalled();
    });

    it('When Delegate fails / Then an alert is shown with error message', async () => {
      vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockFlowApi.performApprovalAction.mockRejectedValue(new Error('Delegate failed'));
      renderPage();
      await waitFor(() => screen.getByText('Delegate'));
      fireEvent.click(screen.getByText('Delegate'));
      await waitFor(() => screen.getByText(/Delegate: Test Lead/));
      fireEvent.change(screen.getByPlaceholderText(/Enter user UUID/i), { target: { value: 'user-99' } });
      fireEvent.change(screen.getByPlaceholderText(/Why are you delegating/i), { target: { value: 'Going on leave' } });
      const delegateButtons = screen.getAllByText('Delegate');
      fireEvent.click(delegateButtons[0]);
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

  describe('Given effectiveFlagsLoaded is false (flags not yet resolved)', () => {
    beforeEach(() => {
      mockShellBridgeValue = { effectiveFlagsLoaded: false, isFeatureEnabled: () => true };
      mockFlowApi.getPendingApprovals.mockResolvedValue({ data: [approvalWithDelegate] });
    });

    it('When flags are not loaded / Then the Approve / Reject action buttons are absent', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Pending Approvals')).toBeInTheDocument());
      // canApprovalAction === false → action button group not rendered
      expect(screen.queryByText('Approve')).not.toBeInTheDocument();
      expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    });

    it('When flags are not loaded / Then the Delegate button is absent', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Pending Approvals')).toBeInTheDocument());
      expect(screen.queryByText('Delegate')).not.toBeInTheDocument();
    });
  });

  describe('Given effectiveFlagsLoaded is true (flags resolved)', () => {
    beforeEach(() => {
      mockShellBridgeValue = { effectiveFlagsLoaded: true, isFeatureEnabled: () => true };
      mockFlowApi.getPendingApprovals.mockResolvedValue({ data: [approvalWithDelegate] });
    });

    it('When flags are loaded and action is enabled / Then the Approve and Reject buttons are shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Approve')).toBeInTheDocument());
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('When flags are loaded and action is enabled / Then the Delegate button is shown for delegatable approvals', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Delegate')).toBeInTheDocument());
    });
  });
});
