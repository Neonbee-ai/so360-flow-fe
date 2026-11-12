import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/flowApi', () => ({
  flowApi: { getApprovalStats: vi.fn(), getPendingApprovals: vi.fn() },
}));

import { ApprovalDashboard, pendingApprovalRows } from '../pages/ApprovalDashboard';
import { flowApi } from '../services/flowApi';

const api = flowApi as any;
const row = (n: number) => ({
  id: `ap${n}`, entity_type: 'lead', entity_id: `lead-${n}abcdefgh`, is_overdue: false,
  time_elapsed_hours: n, entity_data: { name: `Lead ${n}` },
});

describe('pendingApprovalRows', () => {
  it('Given a bare array (old BE) / When read / Then the array is returned', () => {
    expect(pendingApprovalRows([row(1)])).toHaveLength(1);
  });
  it('Given { data, total } (paging BE) / When read / Then data is returned', () => {
    expect(pendingApprovalRows({ data: [row(1), row(2)], total: 9 })).toHaveLength(2);
  });
  it('Given undefined or junk / When read / Then an empty list is returned', () => {
    expect(pendingApprovalRows(undefined)).toEqual([]);
    expect(pendingApprovalRows({ data: 'x' })).toEqual([]);
  });
});

describe('ApprovalDashboard pending approvals paging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getApprovalStats.mockResolvedValue({ data: { pending_count: 1, overdue_count: 0, avg_cycle_hours: 1, by_entity_type: {} } });
  });

  it('Given the dashboard mounts / When it loads / Then it asks for limit=5 (the rows the card shows) with include_total', async () => {
    api.getPendingApprovals.mockResolvedValue({ data: { data: [row(1)], total: 1 } });
    render(<MemoryRouter><ApprovalDashboard /></MemoryRouter>);
    await waitFor(() => expect(api.getPendingApprovals).toHaveBeenCalledWith({ limit: 5, include_total: true }));
  });

  it('Given a paging BE answering { data, total } / When rendered / Then the rows show', async () => {
    api.getPendingApprovals.mockResolvedValue({ data: { data: [row(1)], total: 42 } });
    render(<MemoryRouter><ApprovalDashboard /></MemoryRouter>);
    expect(await screen.findByText('Lead 1')).toBeInTheDocument();
  });

  it('Given an old BE answering a bare array of 30 / When rendered / Then only the first 5 show', async () => {
    api.getPendingApprovals.mockResolvedValue({ data: Array.from({ length: 30 }, (_, i) => row(i + 1)) });
    render(<MemoryRouter><ApprovalDashboard /></MemoryRouter>);
    expect(await screen.findByText('Lead 5')).toBeInTheDocument();
    expect(screen.queryByText('Lead 6')).not.toBeInTheDocument();
  });
});
