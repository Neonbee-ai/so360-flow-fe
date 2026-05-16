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
    getApprovalStats: vi.fn(),
    getPendingApprovals: vi.fn(),
  },
}));

import { ApprovalDashboard } from '../pages/ApprovalDashboard';
import { flowApi } from '../services/flowApi';

const mockFlowApi = flowApi as any;

const renderPage = () =>
  render(<MemoryRouter><ApprovalDashboard /></MemoryRouter>);

const mockStats = {
  pending_count: 5,
  overdue_count: 2,
  avg_cycle_hours: 4.5,
  by_entity_type: { lead: 3, expense: 2 },
};

const mockApproval = {
  id: 'ap1',
  entity_type: 'lead',
  entity_id: 'lead-abcd1234',
  status: 'pending',
  is_overdue: false,
  time_elapsed_hours: 2,
  entity_data: { name: 'Test Lead' },
};

const mockOverdueApproval = {
  id: 'ap2',
  entity_type: 'expense',
  entity_id: 'exp-efgh5678',
  status: 'pending',
  is_overdue: true,
  time_elapsed_hours: 12,
  entity_data: {},
};

beforeEach(() => {
  vi.resetAllMocks();
  mockNavigate.mockReset();
});

describe('ApprovalDashboard', () => {
  describe('Given stats and pending approvals exist', () => {
    beforeEach(() => {
      mockFlowApi.getApprovalStats.mockResolvedValue({ data: mockStats });
      mockFlowApi.getPendingApprovals.mockResolvedValue({ data: [mockApproval, mockOverdueApproval] });
    });

    it('When the page loads / Then it renders the Approval Dashboard heading', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Approval Dashboard')).toBeInTheDocument());
    });

    it('When the page loads / Then it renders the subtitle', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Approval workflow overview')).toBeInTheDocument());
    });

    it('When stats are loaded / Then the Pending count is displayed', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument());
    });

    it('When stats are loaded / Then the Overdue count is displayed', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());
    });

    it('When stats are loaded / Then avg cycle hours is displayed', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('4.5')).toBeInTheDocument());
    });

    it('When stats contain entity type breakdown / Then entity types are listed', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('lead')).toBeInTheDocument());
      expect(screen.getByText('expense')).toBeInTheDocument();
    });

    it('When stats contain entity type breakdown / Then the section heading is shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Completed by Entity Type')).toBeInTheDocument());
    });

    it('When recent pending approvals exist / Then approval names are shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Test Lead')).toBeInTheDocument());
    });

    it('When an approval is overdue / Then OVERDUE label is displayed', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('OVERDUE')).toBeInTheDocument());
    });

    it('When an approval has entity_data without name / Then entity type and id prefix is shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText(/expense #exp-efgh/)).toBeInTheDocument());
    });

    it('When elapsed hours are present / Then elapsed time is shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText(/2h elapsed/)).toBeInTheDocument());
    });

    it('When back button is clicked / Then navigates to /flow', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Approval Dashboard'));
      // Find the back button (ArrowLeft wrapper)
      const backButton = document.querySelector('button');
      fireEvent.click(backButton!);
      expect(mockNavigate).toHaveBeenCalledWith('/flow');
    });

    it('When View All link is clicked / Then navigates to /flow/approvals/pending', async () => {
      renderPage();
      await waitFor(() => screen.getByText('View All →'));
      fireEvent.click(screen.getByText('View All →'));
      expect(mockNavigate).toHaveBeenCalledWith('/flow/approvals/pending');
    });
  });

  describe('Given no pending approvals exist', () => {
    beforeEach(() => {
      mockFlowApi.getApprovalStats.mockResolvedValue({ data: mockStats });
      mockFlowApi.getPendingApprovals.mockResolvedValue({ data: [] });
    });

    it('When approvals list is empty / Then shows No pending approvals message', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('No pending approvals')).toBeInTheDocument());
    });
  });

  describe('Given stats with zero counts', () => {
    beforeEach(() => {
      mockFlowApi.getApprovalStats.mockResolvedValue({
        data: { pending_count: 0, overdue_count: 0, avg_cycle_hours: 0, by_entity_type: {} },
      });
      mockFlowApi.getPendingApprovals.mockResolvedValue({ data: [] });
    });

    it('When all counts are zero / Then displays 0 for each stat card', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Approval Dashboard')).toBeInTheDocument());
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(3);
    });

    it('When by_entity_type is empty / Then entity type section is not rendered', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Approval Dashboard')).toBeInTheDocument());
      expect(screen.queryByText('Completed by Entity Type')).not.toBeInTheDocument();
    });
  });

  describe('Given getApprovalStats returns null data', () => {
    beforeEach(() => {
      mockFlowApi.getApprovalStats.mockResolvedValue({ data: null });
      mockFlowApi.getPendingApprovals.mockResolvedValue({ data: [] });
    });

    it('When stats are null / Then page still renders without error', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Approval Dashboard')).toBeInTheDocument());
    });
  });

  describe('Given API calls fail', () => {
    beforeEach(() => {
      mockFlowApi.getApprovalStats.mockRejectedValue(new Error('Stats API failed'));
      mockFlowApi.getPendingApprovals.mockRejectedValue(new Error('Approvals API failed'));
    });

    it('When API fails / Then page still renders (errors are swallowed)', async () => {
      renderPage();
      // The component catches errors and renders with empty state
      await waitFor(() => expect(screen.getByText('Approval Dashboard')).toBeInTheDocument());
    });

    it('When API fails / Then no pending approvals message is shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('No pending approvals')).toBeInTheDocument());
    });
  });

  describe('Given getPendingApprovals returns undefined data', () => {
    beforeEach(() => {
      mockFlowApi.getApprovalStats.mockResolvedValue({ data: mockStats });
      mockFlowApi.getPendingApprovals.mockResolvedValue({ data: undefined });
    });

    it('When data is undefined / Then falls back to empty array gracefully', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('No pending approvals')).toBeInTheDocument());
    });
  });

  describe('Given more than 5 pending approvals', () => {
    beforeEach(() => {
      const manyApprovals = Array.from({ length: 8 }, (_, i) => ({
        id: `ap${i}`,
        entity_type: 'lead',
        entity_id: `lead-${i}`,
        status: 'pending',
        is_overdue: false,
        time_elapsed_hours: i,
        entity_data: { name: `Lead ${i}` },
      }));
      mockFlowApi.getApprovalStats.mockResolvedValue({ data: mockStats });
      mockFlowApi.getPendingApprovals.mockResolvedValue({ data: manyApprovals });
    });

    it('When 8 approvals returned / Then only 5 are displayed in recent panel', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Lead 0'));
      // Expect Lead 0-4 but not Lead 5-7
      expect(screen.getByText('Lead 0')).toBeInTheDocument();
      expect(screen.getByText('Lead 4')).toBeInTheDocument();
      expect(screen.queryByText('Lead 5')).not.toBeInTheDocument();
    });
  });

  describe('Given the Recent Pending section', () => {
    beforeEach(() => {
      mockFlowApi.getApprovalStats.mockResolvedValue({ data: mockStats });
      mockFlowApi.getPendingApprovals.mockResolvedValue({ data: [mockApproval] });
    });

    it('When page loads / Then Recent Pending section heading is shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Recent Pending')).toBeInTheDocument());
    });
  });
});
