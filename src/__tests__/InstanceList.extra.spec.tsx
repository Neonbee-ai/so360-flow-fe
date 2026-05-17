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
      await waitFor(() => screen.getByText('Back to Dashboard'));
      fireEvent.click(screen.getByText('Back to Dashboard'));
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
      const buttons = screen.getAllByRole('button');
      // ChevronRight button is at the end
      const nextBtn = buttons.find(b => b.getAttribute('title') === null && !b.textContent);
      // Find by disabled state — prev should be disabled on page 1
      const [prevBtn, nextButton] = screen.getAllByRole('button').filter(
        b => b.querySelector('svg')
      ).slice(-2);
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
      await waitFor(() => screen.getByText('All Types'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'deal' } });
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
      await waitFor(() => screen.getByText('All Types'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'invoice' } });
      await waitFor(() =>
        expect(screen.getByText(/Try adjusting or clearing the filters/i)).toBeInTheDocument()
      );
    });
  });

  describe('Given the cancelled filter button is clicked', () => {
    it('When cancelled clicked / Then fetches with status=cancelled', async () => {
      api.getAllInstances.mockReturnValue(makePageOf([], 0));
      renderPage();
      await waitFor(() => screen.getByText('all'));
      fireEvent.click(screen.getByText('cancelled'));
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
      // click the card container (not the View button)
      const card = screen.getByText('Lead Flow').closest('div[class*=rounded]') as HTMLElement;
      if (card) fireEvent.click(card);
      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith('/flow/instance/inst-77')
      );
    });
  });
});
