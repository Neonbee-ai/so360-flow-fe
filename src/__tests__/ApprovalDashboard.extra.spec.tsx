/**
 * Extra coverage for ApprovalDashboard — entity-type chart bars, overdue badge
 * in recent pending list, "View All" navigation, and zero-stats display.
 */
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

const api = flowApi as any;

const makeStats = (overrides: any = {}) => ({
  pending_count: overrides.pending_count ?? 3,
  overdue_count: overrides.overdue_count ?? 1,
  avg_cycle_hours: overrides.avg_cycle_hours ?? 6.0,
  by_entity_type: overrides.by_entity_type ?? { expense: 5, lead: 3 },
});

const renderPage = () => render(<MemoryRouter><ApprovalDashboard /></MemoryRouter>);

beforeEach(() => vi.resetAllMocks());

describe('ApprovalDashboard (extra)', () => {
  describe('Given stats are loaded with entity type breakdown', () => {
    beforeEach(() => {
      api.getApprovalStats.mockResolvedValue({ data: makeStats() });
      api.getPendingApprovals.mockResolvedValue({ data: [] });
    });

    it('When loaded / Then shows entity type labels in chart', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('expense')).toBeInTheDocument());
      expect(screen.getByText('lead')).toBeInTheDocument();
    });

    it('When loaded / Then shows entity type counts', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument());
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    });

    it('When loaded / Then shows pending count', async () => {
      renderPage();
      await waitFor(() => expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1));
    });

    it('When loaded / Then shows overdue count', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());
    });

    it('When loaded / Then shows avg cycle hours', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('6')).toBeInTheDocument());
    });
  });

  describe('Given stats have no entity type data', () => {
    it('When by_entity_type is empty / Then chart section is not rendered', async () => {
      api.getApprovalStats.mockResolvedValue({ data: makeStats({ by_entity_type: {} }) });
      api.getPendingApprovals.mockResolvedValue({ data: [] });
      renderPage();
      await waitFor(() => screen.getByText('Approval Dashboard'));
      expect(screen.queryByText('Completed by Entity Type')).not.toBeInTheDocument();
    });
  });

  describe('Given recent pending approvals exist', () => {
    const pendingList = [
      { id: 'a1', entity_type: 'lead', entity_id: 'lead-12345678', entity_data: { name: 'Big Lead' }, is_overdue: false, time_elapsed_hours: 2 },
      { id: 'a2', entity_type: 'expense', entity_id: 'exp-98765432', entity_data: {}, is_overdue: true, time_elapsed_hours: 14 },
    ];

    beforeEach(() => {
      api.getApprovalStats.mockResolvedValue({ data: makeStats() });
      api.getPendingApprovals.mockResolvedValue({ data: pendingList });
    });

    it('When loaded / Then shows entity name from entity_data.name', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Big Lead')).toBeInTheDocument());
    });

    it('When entity_data has no name / Then falls back to entity_type + id prefix', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText(/expense #exp-9876/)).toBeInTheDocument());
    });

    it('When approval is overdue / Then shows OVERDUE label', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('OVERDUE')).toBeInTheDocument());
    });

    it('When approval is not overdue / Then no OVERDUE label for it', async () => {
      // Only the second approval is overdue, so only 1 occurrence
      renderPage();
      await waitFor(() => screen.getByText('OVERDUE'));
      expect(screen.getAllByText('OVERDUE')).toHaveLength(1);
    });
  });

  describe('Given View All button in recent pending', () => {
    it('When "View All" is clicked / Then navigates to /flow/approvals/pending', async () => {
      api.getApprovalStats.mockResolvedValue({ data: makeStats() });
      api.getPendingApprovals.mockResolvedValue({ data: [] });
      renderPage();
      await waitFor(() => screen.getByText('View All →'));
      fireEvent.click(screen.getByText('View All →'));
      expect(mockNavigate).toHaveBeenCalledWith('/flow/approvals/pending');
    });
  });

  describe('Given stats are null (API fails)', () => {
    it('When stats API rejects / Then shows 0 for all stat counters', async () => {
      api.getApprovalStats.mockRejectedValue(new Error('No stats'));
      api.getPendingApprovals.mockResolvedValue({ data: [] });
      renderPage();
      await waitFor(() => screen.getByText('Approval Dashboard'));
      // All stat cards should show 0
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Given back button navigation', () => {
    it('When back button clicked / Then navigates to /flow', async () => {
      api.getApprovalStats.mockResolvedValue({ data: makeStats() });
      api.getPendingApprovals.mockResolvedValue({ data: [] });
      renderPage();
      await waitFor(() => screen.getByText('Approval Dashboard'));
      fireEvent.click(screen.getAllByRole('button')[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/flow');
    });
  });
});
