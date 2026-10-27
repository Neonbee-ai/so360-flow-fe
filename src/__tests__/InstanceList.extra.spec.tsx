/**
 * Extra coverage for InstanceList — pagination controls, entity-type filter,
 * PENDING_APPROVAL badge, and back-to-dashboard navigation.
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
  flowApi: { getAllInstances: vi.fn() },
}));

vi.mock('@so360/shell-context', () => ({
  useSandboxLimit: () => ({ isSandboxMode: false, sandboxEntryLimit: 5, limitItems: (items: any[]) => items, isLimited: () => false }),
  useShell: () => ({ currentOrg: { id: 'org-1' } }),
  useQuota: () => ({ isExceeded: () => false, getQuota: () => null }),
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

import { InstanceList } from '../pages/InstanceList';
import { flowApi } from '../services/flowApi';

const api = flowApi as any;

const makeInstance = (id: string, overrides: any = {}) => ({
  id,
  current_state: overrides.current_state ?? 'draft',
  entity_type: overrides.entity_type ?? 'lead',
  entity_id: `eid-${id}`,
  started_at: '2026-02-01T10:00:00Z',
  completed_at: overrides.completed_at ?? null,
  flows: {
    name: overrides.flowName ?? 'Lead Flow',
    module_code: 'module:crm:lead',
    states: [{ code: 'draft', name: 'Draft' }],
  },
});

const makePageOf = (instances: any[], total: number) =>
  Promise.resolve({ data: { data: instances, total } });

const renderPage = () => render(<MemoryRouter><InstanceList /></MemoryRouter>);

beforeEach(() => vi.resetAllMocks());

describe('InstanceList (extra)', () => {
  describe('Given the Back to Dashboard button is clicked', () => {
    it('When clicked / Then navigates to /flow', async () => {
      api.getAllInstances.mockReturnValue(makePageOf([], 0));
      renderPage();
      await waitFor(() => screen.getByRole('button', { name: 'Back to Dashboard' }));
      fireEvent.click(screen.getByRole('button', { name: 'Back to Dashboard' }));
      expect(mockNavigate).toHaveBeenCalledWith('/flow');
    });
  });

  describe('Given an instance is in PENDING_APPROVAL state', () => {
    it('When rendered / Then shows Pending Approval badge', async () => {
      api.getAllInstances.mockReturnValue(
        makePageOf([makeInstance('i1', { current_state: 'PENDING_APPROVAL' })], 1)
      );
      renderPage();
      await waitFor(() => expect(screen.getByText('Pending Approval')).toBeInTheDocument());
    });
  });

  describe('Given pagination is needed (more than 20 results)', () => {
    const INSTANCES = Array.from({ length: 20 }, (_, i) => makeInstance(`i${i}`, { flowName: `Flow ${i}` }));

    beforeEach(() => {
      // first page returns 20 items with total=25 to trigger pagination
      api.getAllInstances.mockReturnValue(makePageOf(INSTANCES, 25));
    });

    it('When loaded / Then shows Page 1 of 2', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Page 1 of 2')).toBeInTheDocument());
    });

    it('When next page button clicked / Then fetches offset 20', async () => {
      api.getAllInstances.mockReturnValue(makePageOf(INSTANCES, 25));
      renderPage();
      await waitFor(() => screen.getByText('Page 1 of 2'));
      const nextButton = screen.getByRole('button', { name: 'Next page' });
      fireEvent.click(nextButton);
      await waitFor(() =>
        expect(api.getAllInstances).toHaveBeenCalledWith(
          expect.objectContaining({ offset: 20 })
        )
      );
    });

    it('When on page 1 / Then previous button is disabled', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Page 1 of 2'));
      // The pagination prev button is disabled when page=0
      const svgButtons = document.querySelectorAll('button[disabled]');
      expect(svgButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Given entity type filter is changed', () => {
    it('When deal is selected / Then fetches with entity_type=deal', async () => {
      api.getAllInstances.mockReturnValue(makePageOf([], 0));
      renderPage();
      await waitFor(() => screen.getByLabelText('Entity Type'));
      fireEvent.change(screen.getByLabelText('Entity Type'), { target: { value: 'deal' } });
      await waitFor(() =>
        expect(api.getAllInstances).toHaveBeenCalledWith(
          expect.objectContaining({ entity_type: 'deal' })
        )
      );
    });
  });

  describe('Given filter produces no results', () => {
    it('When no results with active filter / Then shows filter hint', async () => {
      api.getAllInstances.mockReturnValue(makePageOf([], 0));
      renderPage();
      await waitFor(() => screen.getByLabelText('Entity Type'));
      fireEvent.change(screen.getByLabelText('Entity Type'), { target: { value: 'invoice' } });
      await waitFor(() =>
        expect(screen.getByText(/Try adjusting or clearing the filters/i)).toBeInTheDocument()
      );
    });
  });

  describe('Given the cancelled filter button is clicked', () => {
    it('When cancelled clicked / Then fetches with status=cancelled', async () => {
      api.getAllInstances.mockReturnValue(makePageOf([], 0));
      renderPage();
      await waitFor(() => screen.getByLabelText('Status'));
      fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'cancelled' } });
      await waitFor(() =>
        expect(api.getAllInstances).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'cancelled' })
        )
      );
    });
  });

  describe('Given an instance row is clicked', () => {
    it('When card is clicked / Then navigates to instance viewer', async () => {
      api.getAllInstances.mockReturnValue(
        makePageOf([makeInstance('inst-77')], 1)
      );
      renderPage();
      await waitFor(() => screen.getByText('Lead Flow'));
      // click the card container 
      const card = screen.getByText('Lead Flow').closest('tr') as HTMLElement;
      if (card) fireEvent.click(card);
      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith('/flow/instance/inst-77')
      );
    });
  });
});
