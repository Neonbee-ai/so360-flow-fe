/**
 * approval-policies-modals.bdd.test.tsx
 * BDD unit tests asserting ApprovalPoliciesPage modal panels are capped at
 * max-h-[90vh] so no modal can exceed 90% of the viewport height.
 *
 * Covers the two inline dialogs:
 *   - Confirm-delete (Deactivate Policy?) modal
 *   - Simulation (Policy Simulation) modal
 *
 * Mocking conventions mirror src/__tests__/timezone.bdd.test.tsx.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Override @so360/shell-context (vitest alias provides a base stub)
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
  };
});

// ---------------------------------------------------------------------------
// flowApi mock
// ---------------------------------------------------------------------------

vi.mock('../services/flowApi', () => ({
  flowApi: {
    getApprovalPolicies: vi.fn(),
    deactivatePolicy: vi.fn(),
    simulatePolicy: vi.fn(),
    updatePolicy: vi.fn(),
    createApprovalPolicy: vi.fn(),
    createApprovalRule: vi.fn(),
    createApprovalStep: vi.fn(),
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
import { ApprovalPoliciesPage } from '../pages/ApprovalPoliciesPage';

const mockFlowApi = flowApi as any;

const POLICY = {
  id: 'pol-1',
  name: 'High-Value Expense Policy',
  entity_type: 'expense',
  approval_mode: 'SEQUENTIAL',
  is_active: true,
  priority: 10,
  steps: [],
};

const cappedPanels = () =>
  Array.from(document.querySelectorAll('div')).filter(el =>
    el.className.includes('max-h-[90vh]')
  );

describe('Given ApprovalPoliciesPage modals / Then each panel is capped at max-h-[90vh]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFlowApi.getApprovalPolicies.mockResolvedValue({ data: [POLICY] });
    mockFlowApi.simulatePolicy.mockResolvedValue({ data: { matched: true, steps: [] } });
  });

  const renderPage = async () => {
    render(<MemoryRouter><ApprovalPoliciesPage /></MemoryRouter>);
    await screen.findByText('High-Value Expense Policy');
  };

  it('When the Confirm-delete modal is opened / Then a max-h-[90vh] panel exists', async () => {
    await renderPage();
    fireEvent.click(screen.getByTitle('Delete policy'));
    await screen.findByText('Deactivate Policy?');
    expect(cappedPanels().length).toBeGreaterThan(0);
  });

  it('When the Simulation modal is opened / Then a max-h-[90vh] panel exists', async () => {
    await renderPage();
    fireEvent.click(screen.getByTitle('Test policy'));
    await screen.findByText('Policy Simulation');
    expect(cappedPanels().length).toBeGreaterThan(0);
  });
});
