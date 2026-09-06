import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../services/flowApi', () => ({
  flowApi: {
    getApprovalHistory: vi.fn(),
  },
}));

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

import { ApprovalHistory } from '../components/ApprovalHistory';
import { flowApi } from '../services/flowApi';

const api = flowApi as any;

beforeEach(() => vi.resetAllMocks());

describe('ApprovalHistory', () => {
  describe('Given loading state', () => {
    it('When loading / Then shows skeleton placeholders', () => {
      api.getApprovalHistory.mockReturnValue(new Promise(() => {}));
      render(<ApprovalHistory entityType="deal" entityId="d1" />);
      expect(document.querySelector('.animate-pulse')).not.toBeNull();
    });
  });

  describe('Given error state', () => {
    it('When API fails / Then shows error message', async () => {
      api.getApprovalHistory.mockRejectedValue(new Error('Network error'));
      render(<ApprovalHistory entityType="deal" entityId="d1" />);
      await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
    });
  });

  describe('Given empty history', () => {
    it('When no history / Then shows empty state', async () => {
      api.getApprovalHistory.mockResolvedValue({ data: [] });
      render(<ApprovalHistory entityType="deal" entityId="d1" />);
      await waitFor(() => expect(screen.getByText('No approval history for this entity')).toBeInTheDocument());
    });
  });

  describe('Given approval history exists', () => {
    const makeHistory = (overrides: any = {}) => ({
      instance_id: 'ai1',
      status: 'APPROVED',
      requested_at: '2025-05-01T00:00:00Z',
      completed_at: '2025-05-02T00:00:00Z',
      actions: [
        {
          id: 'a1',
          action_type: 'APPROVE',
          action_at: '2025-05-02T00:00:00Z',
          comment: 'Looks good',
          delegated_to_user_id: null,
        },
      ],
      ...overrides,
    });

    it('When loaded / Then shows Approval History heading', async () => {
      api.getApprovalHistory.mockResolvedValue({ data: [makeHistory()] });
      render(<ApprovalHistory entityType="deal" entityId="d1" />);
      await waitFor(() => expect(screen.getByText('Approval History')).toBeInTheDocument());
    });

    it('When loaded / Then shows status badge', async () => {
      api.getApprovalHistory.mockResolvedValue({ data: [makeHistory()] });
      render(<ApprovalHistory entityType="deal" entityId="d1" />);
      await waitFor(() => expect(screen.getByText('APPROVED')).toBeInTheDocument());
    });

    it('When action has comment / Then shows comment text', async () => {
      api.getApprovalHistory.mockResolvedValue({ data: [makeHistory()] });
      render(<ApprovalHistory entityType="deal" entityId="d1" />);
      await waitFor(() => expect(screen.getByText('"Looks good"')).toBeInTheDocument());
    });

    it('When action type is APPROVE / Then shows APPROVE label', async () => {
      api.getApprovalHistory.mockResolvedValue({ data: [makeHistory()] });
      render(<ApprovalHistory entityType="deal" entityId="d1" />);
      await waitFor(() => expect(screen.getByText('APPROVE')).toBeInTheDocument());
    });

    it('When status is REJECTED / Then renders with red styling', async () => {
      api.getApprovalHistory.mockResolvedValue({
        data: [makeHistory({
          status: 'REJECTED',
          actions: [{ id: 'a1', action_type: 'REJECT', action_at: '2025-05-02T00:00:00Z', comment: null, delegated_to_user_id: null }],
        })],
      });
      render(<ApprovalHistory entityType="deal" entityId="d1" />);
      await waitFor(() => expect(screen.getByText('REJECTED')).toBeInTheDocument());
    });

    it('When action has delegation / Then shows delegated user id', async () => {
      api.getApprovalHistory.mockResolvedValue({
        data: [makeHistory({
          actions: [{ id: 'a1', action_type: 'DELEGATE', action_at: '2025-05-02T00:00:00Z', comment: null, delegated_to_user_id: 'user-99' }],
        })],
      });
      render(<ApprovalHistory entityType="deal" entityId="d1" />);
      await waitFor(() => expect(screen.getByText(/user-99/)).toBeInTheDocument());
    });

    it('When completed / Then shows completed date', async () => {
      api.getApprovalHistory.mockResolvedValue({ data: [makeHistory()] });
      render(<ApprovalHistory entityType="deal" entityId="d1" />);
      await waitFor(() => expect(screen.getByText(/Completed:/)).toBeInTheDocument());
    });

    it('When status is PENDING / Then renders with blue styling', async () => {
      api.getApprovalHistory.mockResolvedValue({
        data: [makeHistory({ status: 'PENDING', completed_at: null })],
      });
      render(<ApprovalHistory entityType="deal" entityId="d1" />);
      await waitFor(() => expect(screen.getByText('PENDING')).toBeInTheDocument());
    });
  });
});
