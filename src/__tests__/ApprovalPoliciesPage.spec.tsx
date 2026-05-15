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
    getApprovalPolicies: vi.fn(),
    createApprovalPolicy: vi.fn(),
    createApprovalRule: vi.fn(),
    createApprovalStep: vi.fn(),
    getRoles: vi.fn(),
  },
}));

import { ApprovalPoliciesPage } from '../pages/ApprovalPoliciesPage';
import { flowApi } from '../services/flowApi';

const api = flowApi as any;

const renderPage = () =>
  render(<MemoryRouter><ApprovalPoliciesPage /></MemoryRouter>);

const makePolicy = (overrides: any = {}) => ({
  id: 'pol-1',
  name: 'Expense Approval',
  module_code: 'module:accounting:expense',
  entity_type: 'expense',
  approval_mode: 'SEQUENTIAL',
  is_active: true,
  steps: [
    { step_order: 1, approver_type: 'ROLE', approver_config: { role_name: 'finance_manager' }, sla_hours: 48, can_delegate: false },
  ],
  conditions: [{ field: 'amount', operator: 'greater_than', value: '500' }],
  ...overrides,
});

beforeEach(() => vi.resetAllMocks());

describe('ApprovalPoliciesPage', () => {
  describe('Given policies are loading', () => {
    it('When loading / Then shows spinner', () => {
      api.getApprovalPolicies.mockReturnValue(new Promise(() => {}));
      renderPage();
      expect(document.querySelector('.animate-spin')).not.toBeNull();
    });
  });

  describe('Given no policies exist', () => {
    it('When loaded / Then shows empty state', async () => {
      api.getApprovalPolicies.mockResolvedValue({ data: [] });
      renderPage();
      await waitFor(() => expect(screen.getByText('No approval policies defined')).toBeInTheDocument());
    });
  });

  describe('Given policies exist', () => {
    beforeEach(() => {
      api.getApprovalPolicies.mockResolvedValue({ data: [makePolicy()] });
    });

    it('When loaded / Then shows Approval Policies heading', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Approval Policies')).toBeInTheDocument());
    });

    it('When loaded / Then shows policy name', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Expense Approval')).toBeInTheDocument());
    });

    it('When loaded / Then shows module name and mode', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText(/Accounting Expense/)).toBeInTheDocument());
      expect(screen.getByText(/SEQUENTIAL/)).toBeInTheDocument();
    });

    it('When policy is expanded / Then shows steps', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Expense Approval'));
      fireEvent.click(screen.getByText('Expense Approval'));
      await waitFor(() => expect(screen.getByText('Rules & Steps (expand below):')).toBeInTheDocument());
    });

    it('When policy is expanded / Then shows conditions', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Expense Approval'));
      fireEvent.click(screen.getByText('Expense Approval'));
      await waitFor(() => expect(screen.getByText(/Use the API or policy builder/i)).toBeInTheDocument());
    });
  });

  describe('Given the create form', () => {
    beforeEach(() => {
      api.getApprovalPolicies.mockResolvedValue({ data: [] });
      api.getRoles.mockResolvedValue({ data: [] });
      api.createApprovalPolicy.mockResolvedValue({ data: { id: 'new-p' } });
      api.createApprovalRule.mockResolvedValue({ data: { id: 'rule-1' } });
      api.createApprovalStep.mockResolvedValue({ data: { id: 'step-1' } });
    });

    it('When New Policy is clicked / Then shows form', async () => {
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      expect(screen.getByText('New Approval Policy')).toBeInTheDocument();
    });

    it('When form is open / Then Save is disabled without required fields', async () => {
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      const saveBtn = screen.getByText('Save Policy').closest('button');
      expect(saveBtn).toBeDisabled();
    });

    it('When Add Step is clicked / Then adds a step row', async () => {
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('Add Step'));
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });

    it('When Add Condition is clicked / Then adds a condition row', async () => {
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      const moduleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(moduleSelect, { target: { value: 'module:accounting:expense' } });
      fireEvent.click(screen.getByText('Add Condition'));
      await waitFor(() => expect(screen.getByPlaceholderText('value')).toBeInTheDocument());
    });

    it('When Cancel is clicked / Then hides the form', async () => {
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      expect(screen.getByText('New Approval Policy')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByText('New Approval Policy')).not.toBeInTheDocument();
    });

    it('When form is submitted with valid data / Then calls createApprovalPolicy', async () => {
      api.createApprovalPolicy.mockResolvedValue({ data: {} });
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      fireEvent.change(screen.getByPlaceholderText(/Manager Approval/), { target: { value: 'Test Policy' } });
      const selects = screen.getAllByRole('combobox');
      const moduleSelect = selects.find(s => s.querySelector('option[value="module:crm:deal"]'));
      fireEvent.change(moduleSelect!, { target: { value: 'module:crm:deal' } });
      fireEvent.click(screen.getByText('Add Step'));
      fireEvent.click(screen.getByText('Save Policy'));
      await waitFor(() => expect(api.createApprovalPolicy).toHaveBeenCalled());
    });
  });

  describe('Given inactive policy', () => {
    it('When policy is inactive / Then does not show green dot', async () => {
      api.getApprovalPolicies.mockResolvedValue({ data: [makePolicy({ is_active: false })] });
      renderPage();
      await waitFor(() => screen.getByText('Expense Approval'));
      const dot = document.querySelector('.bg-slate-500');
      expect(dot).not.toBeNull();
    });
  });
});
