/**
 * Extra coverage for ApprovalHistoryPage — back navigation, invalid params,
 * and forwarding entityType/entityId to the ApprovalHistory component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../components/ApprovalHistory', () => ({
  ApprovalHistory: ({ entityType, entityId }: any) => (
    <div data-testid="approval-history-stub">
      {entityType}/{entityId}
    </div>
  ),
}));

import { ApprovalHistoryPage } from '../pages/ApprovalHistoryPage';

const renderPage = (entityType = 'deal', entityId = 'deal-abc12345') =>
  render(
    <MemoryRouter initialEntries={[`/flow/approvals/history/${entityType}/${entityId}`]}>
      <Routes>
        <Route
          path="/flow/approvals/history/:entityType/:entityId"
          element={<ApprovalHistoryPage />}
        />
      </Routes>
    </MemoryRouter>
  );

const renderPageNoParams = () =>
  render(
    <MemoryRouter initialEntries={['/flow/approvals/history']}>
      <Routes>
        <Route path="/flow/approvals/history" element={<ApprovalHistoryPage />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => vi.resetAllMocks());

describe('ApprovalHistoryPage (extra)', () => {
  describe('Given valid route params', () => {
    it('When rendered / Then shows Approval History heading', () => {
      renderPage();
      expect(screen.getByText('Approval History')).toBeInTheDocument();
    });

    it('When rendered / Then shows entity type in subtitle', () => {
      renderPage('deal', 'deal-abc12345');
      expect(screen.getAllByText(/deal/).length).toBeGreaterThanOrEqual(1);
    });

    it('When rendered / Then shows first 8 chars of entityId', () => {
      renderPage('expense', 'expense-abcdef12');
      expect(screen.getByText(/expense-a/)).toBeInTheDocument();
    });

    it('When rendered / Then passes entityType and entityId to ApprovalHistory', () => {
      renderPage('lead', 'lead-uuid-99');
      expect(screen.getByTestId('approval-history-stub').textContent).toBe('lead/lead-uuid-99');
    });

    it('When back button clicked / Then calls navigate(-1)', () => {
      renderPage();
      const backButton = screen.getAllByRole('button')[0];
      fireEvent.click(backButton);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  describe('Given missing route params', () => {
    it('When entityType and entityId are missing / Then shows invalid params message', () => {
      renderPageNoParams();
      expect(screen.getByText('Invalid entity parameters')).toBeInTheDocument();
    });
  });
});
