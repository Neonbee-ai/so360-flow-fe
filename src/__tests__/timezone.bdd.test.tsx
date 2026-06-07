/**
 * timezone.bdd.test.tsx
 * BDD unit tests for timezone-aware date rendering in so360-flow-fe.
 *
 * Covers:
 *   - InstanceList    — formatDate on started_at and completed_at
 *   - ApprovalHistory — formatDateTime on requested_at, action_at, completed_at
 *   - PendingApprovals — formatDateTime on requested_at
 *
 * The test uses real Intl formatting with UTC / en-US:
 *   formatDate('2025-06-01T10:00:00Z')     → 'Jun 1, 2025'
 *   formatDateTime('2025-06-01T10:00:00Z') → 'Jun 1, 2025, 10:00 AM'
 *   formatDateTime('2025-06-01T10:30:00Z') → 'Jun 1, 2025, 10:30 AM'
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Controlled formatter helpers (real Intl, UTC, en-US)
// ---------------------------------------------------------------------------

function makeUTCFormatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(dateStr));
}

function makeUTCFormatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'UTC',
  }).format(new Date(dateStr));
}

const UTC_FORMATTERS = {
  formatDate: makeUTCFormatDate,
  formatDateTime: makeUTCFormatDateTime,
  formatCurrency: (v: number) => `$${v}`,
  formatNumber: (n: number) => String(n),
};

// ---------------------------------------------------------------------------
// Mock the utils/formatters module — intercept before the component imports it
// ---------------------------------------------------------------------------

vi.mock('../utils/formatters', () => ({
  useFlowFormatters: () => UTC_FORMATTERS,
}));

// ---------------------------------------------------------------------------
// Override @so360/shell-context to add useSandboxLimit and useQuota
// (the vitest alias provides a base stub that lacks these)
// ---------------------------------------------------------------------------

vi.mock('@so360/shell-context', async () => {
  const base = await vi.importActual<any>('@so360/shell-context');
  return {
    ...base,
    useShell: () => ({ isModuleEnabled: () => true, currentOrg: { id: 'org-1' } }),
    useShellBridge: () => ({
      effectiveFlagsLoaded: true,
      isFeatureEnabled: () => true,
      isFeatureHidden: () => false,
    }),
    useActivity: () => ({ recordActivity: async () => {} }),
    useSandboxLimit: () => ({
      isSandboxMode: false,
      sandboxEntryLimit: 100,
      limitItems: (i: any[]) => i,
      isLimited: () => false,
    }),
    useQuota: () => ({
      isExceeded: () => false,
      getQuota: () => null,
    }),
  };
});

// ---------------------------------------------------------------------------
// flowApi mock
// ---------------------------------------------------------------------------

vi.mock('../services/flowApi', () => ({
  flowApi: {
    getAllInstances: vi.fn(),
    getApprovalHistory: vi.fn(),
    getPendingApprovals: vi.fn(),
    performApprovalAction: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Navigation mock
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import { flowApi } from '../services/flowApi';
import { InstanceList } from '../pages/InstanceList';
import { ApprovalHistory } from '../components/ApprovalHistory';
import { PendingApprovals } from '../pages/PendingApprovals';

const mockFlowApi = flowApi as any;

// ---------------------------------------------------------------------------
// Shared UTC ISO timestamps and expected formatted values
// ---------------------------------------------------------------------------

const UTC_DATE  = '2025-06-01T10:00:00Z';   // formatDate  → 'Jun 1, 2025'
const UTC_DATE2 = '2025-06-01T14:00:00Z';   // formatDate  → 'Jun 1, 2025'
const UTC_DT    = '2025-06-01T10:00:00Z';   // formatDateTime → 'Jun 1, 2025, 10:00 AM'
const UTC_DT2   = '2025-06-01T10:30:00Z';   // formatDateTime → 'Jun 1, 2025, 10:30 AM'

const FMT_DATE  = makeUTCFormatDate(UTC_DATE);   // 'Jun 1, 2025'
const FMT_DT    = makeUTCFormatDateTime(UTC_DT);  // 'Jun 1, 2025, 10:00 AM'
const FMT_DT2   = makeUTCFormatDateTime(UTC_DT2); // 'Jun 1, 2025, 10:30 AM'

// ---------------------------------------------------------------------------
// InstanceList — date rendering via formatters.formatDate
// ---------------------------------------------------------------------------

describe('Given an InstanceList with UTC started_at / completed_at', () => {
  beforeEach(() => vi.resetAllMocks());

  it('When a non-completed instance is rendered / Then started_at shows "Jun 1, 2025"', async () => {
    mockFlowApi.getAllInstances.mockResolvedValue({
      data: {
        data: [
          {
            id: 'inst-active',
            current_state: 'ACTIVE',
            entity_type: 'lead',
            entity_id: 'lead-1',
            started_at: UTC_DATE,
            completed_at: null,
            flows: {
              name: 'Lead Approval',
              module_code: 'crm',
              states: [{ code: 'ACTIVE', name: 'Active' }],
            },
          },
        ],
        total: 1,
      },
    });

    render(<MemoryRouter><InstanceList /></MemoryRouter>);

    await waitFor(() =>
      expect(screen.getAllByText(FMT_DATE).length).toBeGreaterThan(0)
    );
  });

  it('When a completed instance is rendered / Then completed_at shows "Jun 1, 2025"', async () => {
    mockFlowApi.getAllInstances.mockResolvedValue({
      data: {
        data: [
          {
            id: 'inst-done',
            current_state: 'COMPLETED',
            entity_type: 'expense',
            entity_id: 'exp-1',
            started_at: UTC_DATE,
            completed_at: UTC_DATE2,
            flows: {
              name: 'Expense Approval',
              module_code: 'accounting',
              states: [{ code: 'COMPLETED', name: 'Completed' }],
            },
          },
        ],
        total: 1,
      },
    });

    render(<MemoryRouter><InstanceList /></MemoryRouter>);

    await waitFor(() =>
      expect(screen.getAllByText(FMT_DATE).length).toBeGreaterThan(0)
    );
  });

  it('When multiple instances are rendered / Then all date cells show "Jun 1, 2025"', async () => {
    mockFlowApi.getAllInstances.mockResolvedValue({
      data: {
        data: [
          {
            id: 'inst-1',
            current_state: 'ACTIVE',
            entity_type: 'lead',
            entity_id: 'lead-1',
            started_at: UTC_DATE,
            completed_at: null,
            flows: { name: 'Flow A', module_code: 'crm', states: [] },
          },
          {
            id: 'inst-2',
            current_state: 'COMPLETED',
            entity_type: 'deal',
            entity_id: 'deal-1',
            started_at: UTC_DATE,
            completed_at: UTC_DATE,
            flows: { name: 'Flow B', module_code: 'crm', states: [] },
          },
        ],
        total: 2,
      },
    });

    render(<MemoryRouter><InstanceList /></MemoryRouter>);

    await waitFor(() => {
      const cells = screen.getAllByText(FMT_DATE);
      expect(cells.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ---------------------------------------------------------------------------
// ApprovalHistory — formatDateTime on requested_at, action_at, completed_at
// ---------------------------------------------------------------------------

describe('Given ApprovalHistory with UTC requested_at and action_at', () => {
  beforeEach(() => vi.resetAllMocks());

  it('When rendered / Then requested_at shows "Jun 1, 2025, 10:00 AM" format', async () => {
    mockFlowApi.getApprovalHistory.mockResolvedValue({
      data: [
        {
          instance_id: 'ah-inst-1',
          status: 'APPROVED',
          requested_at: UTC_DT,
          completed_at: null,
          actions: [],
        },
      ],
    });

    render(
      <MemoryRouter>
        <ApprovalHistory entityType="lead" entityId="lead-1" />
      </MemoryRouter>
    );

    // "Started: Jun 1, 2025, 10:00 AM" — text is split across sibling nodes
    await waitFor(() => {
      const els = screen.getAllByText((_, node) =>
        node?.textContent?.includes(FMT_DT) === true
      );
      expect(els.length).toBeGreaterThan(0);
    });
  });

  it('When an action with action_at is rendered / Then action_at shows datetime format', async () => {
    mockFlowApi.getApprovalHistory.mockResolvedValue({
      data: [
        {
          instance_id: 'ah-inst-2',
          status: 'APPROVED',
          requested_at: UTC_DT,
          completed_at: null,
          actions: [
            {
              id: 'act-1',
              action_type: 'APPROVE',
              action_at: UTC_DT2,
              comment: 'Looks good',
              delegated_to_user_id: null,
              approval_steps: { step_order: 1 },
            },
          ],
        },
      ],
    });

    render(
      <MemoryRouter>
        <ApprovalHistory entityType="expense" entityId="exp-1" />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByText(FMT_DT2)).toBeInTheDocument()
    );
  });

  it('When a completed instance is rendered / Then completed_at shows datetime format', async () => {
    mockFlowApi.getApprovalHistory.mockResolvedValue({
      data: [
        {
          instance_id: 'ah-inst-3',
          status: 'APPROVED',
          requested_at: UTC_DT,
          completed_at: UTC_DT,
          actions: [],
        },
      ],
    });

    render(
      <MemoryRouter>
        <ApprovalHistory entityType="deal" entityId="deal-1" />
      </MemoryRouter>
    );

    // "Started: ..." and "Completed: ..." — text may be split across siblings
    await waitFor(() => {
      const nodes = screen.getAllByText((_, node) =>
        node?.textContent?.includes(FMT_DT) === true
      );
      expect(nodes.length).toBeGreaterThan(0);
    });
  });

  it('When multiple actions are present / Then each action_at is formatted correctly', async () => {
    mockFlowApi.getApprovalHistory.mockResolvedValue({
      data: [
        {
          instance_id: 'ah-inst-4',
          status: 'REJECTED',
          requested_at: UTC_DT,
          completed_at: null,
          actions: [
            {
              id: 'act-a',
              action_type: 'APPROVE',
              action_at: UTC_DT,
              comment: 'First step ok',
              delegated_to_user_id: null,
            },
            {
              id: 'act-b',
              action_type: 'REJECT',
              action_at: UTC_DT2,
              comment: 'Second step rejected',
              delegated_to_user_id: null,
            },
          ],
        },
      ],
    });

    render(
      <MemoryRouter>
        <ApprovalHistory entityType="invoice" entityId="inv-1" />
      </MemoryRouter>
    );

    await waitFor(() => {
      // requested_at and first action → FMT_DT (10:00 AM)
      const tenAM = screen.getAllByText(FMT_DT);
      expect(tenAM.length).toBeGreaterThanOrEqual(1);
      // second action → FMT_DT2 (10:30 AM)
      expect(screen.getByText(FMT_DT2)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// PendingApprovals — formatDateTime on requested_at
// ---------------------------------------------------------------------------

describe('Given PendingApprovals with UTC requested_at', () => {
  beforeEach(() => vi.resetAllMocks());

  it('When a pending approval is rendered / Then requested_at shows datetime format', async () => {
    mockFlowApi.getPendingApprovals.mockResolvedValue({
      data: [
        {
          id: 'pa-1',
          entity_type: 'lead',
          entity_id: 'lead-abc',
          status: 'PENDING',
          is_overdue: false,
          time_elapsed_hours: 2,
          sla_hours: 24,
          requested_at: UTC_DT,
          current_step: { id: 'step-1', step_order: 1 },
          entity_data: { name: 'New Lead Request' },
        },
      ],
    });

    render(<MemoryRouter><PendingApprovals /></MemoryRouter>);

    await waitFor(() =>
      expect(screen.getByText(new RegExp(FMT_DT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument()
    );
  });

  it('When multiple pending approvals are rendered / Then each requested_at shows formatted datetime', async () => {
    mockFlowApi.getPendingApprovals.mockResolvedValue({
      data: [
        {
          id: 'pa-2',
          entity_type: 'deal',
          entity_id: 'deal-aaa',
          status: 'PENDING',
          is_overdue: false,
          time_elapsed_hours: 1,
          sla_hours: 8,
          requested_at: UTC_DT,
          current_step: { id: 'step-1', step_order: 1 },
          entity_data: { name: 'Deal Approval' },
        },
        {
          id: 'pa-3',
          entity_type: 'expense',
          entity_id: 'exp-bbb',
          status: 'PENDING',
          is_overdue: true,
          time_elapsed_hours: 30,
          sla_hours: 24,
          requested_at: UTC_DT2,
          current_step: { id: 'step-2', step_order: 1 },
          entity_data: { name: 'Expense Claim' },
        },
      ],
    });

    render(<MemoryRouter><PendingApprovals /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText(new RegExp(FMT_DT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(FMT_DT2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
    });
  });

  it('When no pending approvals exist / Then no datetime is rendered', async () => {
    mockFlowApi.getPendingApprovals.mockResolvedValue({ data: [] });

    render(<MemoryRouter><PendingApprovals /></MemoryRouter>);

    await waitFor(() =>
      expect(screen.getByText('All Caught Up!')).toBeInTheDocument()
    );
    expect(screen.queryByText(/Jun 1, 2025/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// PendingApprovals — modal panels capped at max-h-[90vh]
// ---------------------------------------------------------------------------

describe('Given PendingApprovals modals / Then each panel is capped at max-h-[90vh]', () => {
  beforeEach(() => vi.resetAllMocks());

  const renderPending = async () => {
    mockFlowApi.getPendingApprovals.mockResolvedValue({
      data: [
        {
          id: 'pa-modal-1',
          entity_type: 'lead',
          entity_id: 'lead-modal',
          status: 'PENDING',
          is_overdue: false,
          time_elapsed_hours: 1,
          sla_hours: 24,
          requested_at: UTC_DT,
          current_step: { id: 'step-1', step_order: 1, can_delegate: true },
          entity_data: { name: 'Modal Approval' },
        },
      ],
    });
    render(<MemoryRouter><PendingApprovals /></MemoryRouter>);
    // 'Modal Approval' renders twice (card heading + entity-details grid),
    // so use findAllByText to avoid the multiple-match error from findByText.
    await screen.findAllByText('Modal Approval');
  };

  const cappedPanels = () =>
    Array.from(document.querySelectorAll('div')).filter(el =>
      el.className.includes('max-h-[90vh]')
    );

  it('When the Approve modal is opened / Then a max-h-[90vh] panel exists', async () => {
    await renderPending();
    fireEvent.click(screen.getByRole('button', { name: /Approve/i }));
    await screen.findByText(/Approve: Modal Approval/);
    expect(cappedPanels().length).toBeGreaterThan(0);
  });

  it('When the Reject modal is opened / Then a max-h-[90vh] panel exists', async () => {
    await renderPending();
    fireEvent.click(screen.getByRole('button', { name: /Reject/i }));
    await screen.findByText(/Reject: Modal Approval/);
    expect(cappedPanels().length).toBeGreaterThan(0);
  });

  it('When the Delegate modal is opened / Then a max-h-[90vh] panel exists', async () => {
    await renderPending();
    fireEvent.click(screen.getByRole('button', { name: /Delegate/i }));
    await screen.findByText(/Delegate: Modal Approval/);
    expect(cappedPanels().length).toBeGreaterThan(0);
  });
});
