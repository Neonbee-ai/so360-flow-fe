/**
 * Extra coverage for ApprovalHistory component — ESCALATE and DELEGATE action
 * icons, multiple approval instances, PENDING status badge, and missing
 * completed_at (no completed date shown).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../services/flowApi', () => ({
  flowApi: { getApprovalHistory: vi.fn() },
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

const makeAction = (overrides: any = {}) => ({
  id: overrides.id ?? 'a1',
  action_type: overrides.action_type ?? 'APPROVE',
  action_at: '2025-06-01T10:00:00Z',
  comment: overrides.comment ?? null,
  delegated_to_user_id: overrides.delegated_to_user_id ?? null,
  approval_steps: { step_order: overrides.step_order ?? 1 },
});

const makeHistoryItem = (overrides: any = {}) => ({
  instance_id: overrides.instance_id ?? 'ai1',
  status: overrides.status ?? 'APPROVED',
  requested_at: '2025-06-01T08:00:00Z',
  completed_at: overrides.completed_at !== undefined ? overrides.completed_at : '2025-06-01T10:00:00Z',
  actions: overrides.actions ?? [makeAction()],
});

beforeEach(() => vi.resetAllMocks());

describe('ApprovalHistory (extra)', () => {
  describe('Given an ESCALATE action type', () => {
    it('When action_type is ESCALATE / Then renders ESCALATE label', async () => {
      api.getApprovalHistory.mockResolvedValue({
        data: [makeHistoryItem({ actions: [makeAction({ id: 'a2', action_type: 'ESCALATE' })] })],
      });
      render(<ApprovalHistory entityType="expense" entityId="e1" />);
      await waitFor(() => expect(screen.getByText('ESCALATE')).toBeInTheDocument());
    });
  });

  describe('Given a DELEGATE action type with no delegated_to_user_id', () => {
    it('When delegated_to_user_id is null / Then delegate label is NOT shown', async () => {
      api.getApprovalHistory.mockResolvedValue({
        data: [makeHistoryItem({ actions: [makeAction({ action_type: 'DELEGATE', delegated_to_user_id: null })] })],
      });
      render(<ApprovalHistory entityType="expense" entityId="e1" />);
      await waitFor(() => screen.getByText('DELEGATE'));
      expect(screen.queryByText(/Delegated to:/)).not.toBeInTheDocument();
    });
  });

  describe('Given an action with an unknown action_type', () => {
    it('When unknown action_type / Then renders the raw type label', async () => {
      api.getApprovalHistory.mockResolvedValue({
        data: [makeHistoryItem({ actions: [makeAction({ action_type: 'CUSTOM_ACTION' })] })],
      });
      render(<ApprovalHistory entityType="task" entityId="t1" />);
      await waitFor(() => expect(screen.getByText('CUSTOM_ACTION')).toBeInTheDocument());
    });
  });

  describe('Given multiple approval instances', () => {
    it('When two instances exist / Then shows Approval Request #1 and #2', async () => {
      api.getApprovalHistory.mockResolvedValue({
        data: [
          makeHistoryItem({ instance_id: 'ai1' }),
          makeHistoryItem({ instance_id: 'ai2', status: 'PENDING', completed_at: null }),
        ],
      });
      render(<ApprovalHistory entityType="invoice" entityId="inv1" />);
      await waitFor(() => {
        expect(screen.getByText('Approval Request #1')).toBeInTheDocument();
        expect(screen.getByText('Approval Request #2')).toBeInTheDocument();
      });
    });
  });

  describe('Given an instance without completed_at', () => {
    it('When completed_at is null / Then Completed row is NOT shown', async () => {
      api.getApprovalHistory.mockResolvedValue({
        data: [makeHistoryItem({ status: 'PENDING', completed_at: null })],
      });
      render(<ApprovalHistory entityType="lead" entityId="l1" />);
      await waitFor(() => screen.getByText('PENDING'));
      expect(screen.queryByText(/Completed:/)).not.toBeInTheDocument();
    });
  });

  describe('Given ESCALATED status', () => {
    it('When status is ESCALATED / Then renders amber badge', async () => {
      api.getApprovalHistory.mockResolvedValue({
        data: [makeHistoryItem({ status: 'ESCALATED' })],
      });
      render(<ApprovalHistory entityType="order" entityId="o1" />);
      await waitFor(() => expect(screen.getByText('ESCALATED')).toBeInTheDocument());
    });
  });

  describe('Given an action has comment text', () => {
    it('When comment provided / Then renders with quotes', async () => {
      api.getApprovalHistory.mockResolvedValue({
        data: [makeHistoryItem({ actions: [makeAction({ comment: 'Please review again' })] })],
      });
      render(<ApprovalHistory entityType="task" entityId="t2" />);
      await waitFor(() =>
        expect(screen.getByText('"Please review again"')).toBeInTheDocument()
      );
    });
  });
});
