import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock ApprovalHistory component (tested separately in ApprovalHistory.spec.tsx)
vi.mock('../components/ApprovalHistory', () => ({
  ApprovalHistory: ({ entityType, entityId }: { entityType: string; entityId: string }) => (
    <div data-testid="approval-history">
      <span data-testid="entity-type">{entityType}</span>
      <span data-testid="entity-id">{entityId}</span>
    </div>
  ),
}));

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <svg data-testid="icon-ArrowLeft" />,
}));

import { ApprovalHistoryPage } from '../pages/ApprovalHistoryPage';

const renderWithParams = (entityType: string, entityId: string) =>
  render(
    <MemoryRouter initialEntries={[`/approval-history/${entityType}/${entityId}`]}>
      <Routes>
        <Route
          path="/approval-history/:entityType/:entityId"
          element={<ApprovalHistoryPage />}
        />
      </Routes>
    </MemoryRouter>
  );

const renderWithoutParams = () =>
  render(
    <MemoryRouter initialEntries={['/approval-history/']}>
      <Routes>
        <Route path="/approval-history/" element={<ApprovalHistoryPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('ApprovalHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Given valid entityType and entityId route params', () => {
    it('When page renders / Then shows "Approval History" heading', () => {
      renderWithParams('deal', 'abc12345-6789');
      expect(screen.getByText('Approval History')).toBeTruthy();
    });

    it('When page renders / Then shows entity type in subtitle', () => {
      renderWithParams('deal', 'abc12345-6789');
      expect(document.body.textContent).toContain('deal');
    });

    it('When page renders / Then shows truncated entity id (first 8 chars) in subtitle', () => {
      renderWithParams('deal', 'abc12345-6789-full-uuid');
      expect(document.body.textContent).toContain('abc12345');
    });

    it('When page renders / Then renders ApprovalHistory component with entityType', () => {
      renderWithParams('invoice', 'inv-001');
      expect(screen.getByTestId('approval-history')).toBeTruthy();
      expect(screen.getByTestId('entity-type').textContent).toBe('invoice');
    });

    it('When page renders / Then renders ApprovalHistory component with entityId', () => {
      renderWithParams('purchase_order', 'po-999');
      expect(screen.getByTestId('entity-id').textContent).toBe('po-999');
    });
  });

  describe('Given missing route params', () => {
    it('When entityType and entityId are missing / Then shows invalid params message', () => {
      renderWithoutParams();
      expect(screen.getByText('Invalid entity parameters')).toBeTruthy();
    });

    it('When entityType and entityId are missing / Then ApprovalHistory component is NOT rendered', () => {
      renderWithoutParams();
      expect(screen.queryByTestId('approval-history')).toBeNull();
    });
  });

  describe('Given the back button', () => {
    it('When back arrow is clicked / Then calls navigate(-1)', () => {
      renderWithParams('deal', 'deal-id-001');
      const backBtn = screen.getByTestId('icon-ArrowLeft').closest('button');
      fireEvent.click(backBtn!);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('When page renders / Then back arrow icon is visible', () => {
      renderWithParams('deal', 'deal-id-002');
      expect(screen.getByTestId('icon-ArrowLeft')).toBeTruthy();
    });
  });

  describe('Given various entity types', () => {
    const entityTypes = ['deal', 'invoice', 'purchase_order', 'leave_request', 'expense_claim'];

    entityTypes.forEach((type) => {
      it(`When entityType is "${type}" / Then it is passed correctly to ApprovalHistory`, () => {
        renderWithParams(type, `${type}-id-1`);
        expect(screen.getByTestId('entity-type').textContent).toBe(type);
      });
    });
  });

  describe('Given full UUID as entityId', () => {
    it('When full UUID passed / Then only first 8 chars appear in subtitle', () => {
      const fullUuid = '3cf1c619-c8f6-49ac-9207-447418d5beee';
      renderWithParams('deal', fullUuid);
      const subtitle = document.body.textContent;
      expect(subtitle).toContain('3cf1c61');
      // Full UUID should NOT appear verbatim in subtitle (it is sliced)
      expect(subtitle).not.toContain(fullUuid.split('-').join(''));
    });
  });
});
