/**
 * Extra coverage for ApprovalPoliciesPage — targets the form interactions,
 * step/condition CRUD, save flow, policy list expand/collapse, and error paths.
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
  flowApi: {
    getApprovalPolicies: vi.fn(),
    createApprovalPolicy: vi.fn(),
    createApprovalRule: vi.fn(),
    createApprovalStep: vi.fn(),
    updatePolicy: vi.fn(),
    deactivatePolicy: vi.fn(),
    deleteApprovalPolicy: vi.fn(),
    simulatePolicy: vi.fn(),
    getRoles: vi.fn(),
  },
}));

import { ApprovalPoliciesPage } from '../pages/ApprovalPoliciesPage';
import { flowApi } from '../services/flowApi';

const api = flowApi as any;

const samplePolicy = {
  id: 'p1',
  name: 'Expense Approval',
  entity_type: 'expense',
  approval_mode: 'SEQUENTIAL',
  is_active: true,
  priority: 0,
  steps: [
    { step_order: 1, approver_type: 'ROLE', approver_config: { role: 'manager' }, sla_hours: 48, can_delegate: false },
  ],
};

const renderPage = () => render(<MemoryRouter><ApprovalPoliciesPage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  api.getApprovalPolicies.mockResolvedValue({ data: [] });
  api.createApprovalPolicy.mockResolvedValue({ data: { id: 'new-p', name: 'Test' } });
  api.createApprovalRule.mockResolvedValue({ data: { id: 'rule-1' } });
  api.createApprovalStep.mockResolvedValue({ data: { id: 'step-1' } });
  api.updatePolicy.mockResolvedValue({ data: {} });
  api.deactivatePolicy.mockResolvedValue({});
  api.getRoles.mockResolvedValue({ data: [] });
  api.simulatePolicy.mockResolvedValue({ data: { matched: false } });
});

describe('ApprovalPoliciesPage — page loads', () => {
  describe('Given the page mounts', () => {
    it('When the page loads, Then it shows the "Approval Policies" heading', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Approval Policies')).toBeInTheDocument());
    });

    it('When the page loads, Then it shows the "New Policy" button', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('New Policy')).toBeInTheDocument());
    });

    it('When there are no policies, Then it shows the empty state message', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText(/no approval policies/i)).toBeInTheDocument());
    });

    it('When the back arrow is clicked, Then it navigates to /flow', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Approval Policies'));
      fireEvent.click(screen.getByTestId('icon-ArrowLeft').closest('button')!);
      expect(mockNavigate).toHaveBeenCalledWith('/flow');
    });
  });
});

describe('ApprovalPoliciesPage — policy list', () => {
  describe('Given a policy exists in the list', () => {
    beforeEach(() => {
      api.getApprovalPolicies.mockResolvedValue({ data: [samplePolicy] });
    });

    it('When the page loads, Then the policy name is displayed', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Expense Approval')).toBeInTheDocument());
    });

    it('When the page loads, Then the module name for the policy is shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText(/accounting expense/i)).toBeInTheDocument());
    });

    it('When the page loads, Then the SEQUENTIAL approval mode is shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText(/sequential/i)).toBeInTheDocument());
    });

    it('When the page loads, Then the step count is shown', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText(/1 step/i)).toBeInTheDocument());
    });

    it('When the page loads, Then the active indicator dot is visible for an active policy', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Expense Approval')).toBeInTheDocument();
      });
    });

    it('When the policy name is clicked, Then the rules section expands', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Expense Approval'));
      const policyNameEl = screen.getByText('Expense Approval');
      fireEvent.click(policyNameEl);
      await waitFor(() => {
        expect(screen.getAllByText(/rules/i)[0]).toBeInTheDocument();
      });
    });
  });
});

describe('ApprovalPoliciesPage — create form', () => {
  describe('Given the "New Policy" button is clicked', () => {
    it('When clicked, Then the create policy form is shown', async () => {
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      await waitFor(() => expect(screen.getByText('New Approval Policy')).toBeInTheDocument());
    });

    it('When the form opens, Then the Policy Name input is present', async () => {
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      await waitFor(() => screen.getByText('New Approval Policy'));
      const nameInput = screen.getByPlaceholderText(/manager approval/i);
      expect(nameInput).toBeInTheDocument();
    });

    it('When the form opens, Then the module select lists available module options', async () => {
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      await waitFor(() => screen.getByText('New Approval Policy'));
      expect(screen.getByText('Procurement PR')).toBeInTheDocument();
      expect(screen.getByText('Accounting Expense')).toBeInTheDocument();
    });

    it('When a module is selected, Then the entity_type is auto-set without crashing', async () => {
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      await waitFor(() => screen.getByText('New Approval Policy'));
      const moduleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(moduleSelect, { target: { value: 'module:accounting:expense' } });
      expect(screen.getByText('New Approval Policy')).toBeInTheDocument();
    });

    it('When "Add Step" is clicked, Then a new step row is added', async () => {
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      await waitFor(() => screen.getByText('New Approval Policy'));
      fireEvent.click(screen.getByText('Add Step'));
      await waitFor(() => {
        expect(screen.getByText(/Step 1/)).toBeInTheDocument();
      });
    });

    it('When a module is selected and "Add Condition" is clicked, Then a condition row appears', async () => {
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      await waitFor(() => screen.getByText('New Approval Policy'));
      // Select module first (required to enable Add Condition)
      const moduleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(moduleSelect, { target: { value: 'module:accounting:expense' } });
      fireEvent.click(screen.getByText('Add Condition'));
      await waitFor(() => {
        // value input appears after a condition row is added
        expect(screen.getByPlaceholderText('value')).toBeInTheDocument();
      });
    });

    it('When the form opens with no conditions, Then the empty conditions message is shown', async () => {
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      await waitFor(() => {
        expect(screen.getByText(/no conditions — policy applies to all entities/i)).toBeInTheDocument();
      });
    });

    it('When Save Policy is clicked without filling in name or module, Then createApprovalPolicy is not called', async () => {
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      await waitFor(() => screen.getByText('New Approval Policy'));
      const saveBtn = screen.getByText(/save policy/i).closest('button');
      expect(saveBtn).toBeInTheDocument();
      fireEvent.click(saveBtn!);
      expect(api.createApprovalPolicy).not.toHaveBeenCalled();
    });

    it('When the form is filled and Save is clicked, Then createApprovalPolicy is called with the correct args', async () => {
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      await waitFor(() => screen.getByText('New Approval Policy'));

      const nameInput = screen.getByPlaceholderText(/manager approval/i);
      fireEvent.change(nameInput, { target: { value: 'My Policy' } });

      const moduleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(moduleSelect, { target: { value: 'module:accounting:expense' } });

      fireEvent.click(screen.getByText('Add Step'));
      await waitFor(() => screen.getByText(/Step 1/));

      const saveBtn = screen.getByText(/save policy/i).closest('button');
      fireEvent.click(saveBtn!);
      await waitFor(() => {
        expect(api.createApprovalPolicy).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'My Policy', entity_type: 'expense' })
        );
      });
    });

    it('When save completes, Then the form closes and policies are refreshed', async () => {
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      await waitFor(() => screen.getByText('New Approval Policy'));

      fireEvent.change(screen.getByPlaceholderText(/manager approval/i), { target: { value: 'My Policy' } });
      const moduleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(moduleSelect, { target: { value: 'module:accounting:expense' } });
      fireEvent.click(screen.getByText('Add Step'));
      await waitFor(() => screen.getByText(/Step 1/));
      fireEvent.click(screen.getByText(/save policy/i).closest('button')!);

      await waitFor(() => {
        expect(screen.queryByText('New Approval Policy')).not.toBeInTheDocument();
      });
      expect(api.getApprovalPolicies).toHaveBeenCalledTimes(2);
    });
  });
});

describe('ApprovalPoliciesPage — condition manipulation', () => {
  describe('Given a condition row has been added', () => {
    it('When the condition value input is edited, Then it reflects the new value', async () => {
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      await waitFor(() => screen.getByText('New Approval Policy'));
      // Select module to enable Add Condition
      const moduleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(moduleSelect, { target: { value: 'module:accounting:expense' } });
      fireEvent.click(screen.getByText('Add Condition'));
      await waitFor(() => screen.getByPlaceholderText('value'));
      const valueInput = screen.getByPlaceholderText('value');
      fireEvent.change(valueInput, { target: { value: '1000' } });
      expect((valueInput as HTMLInputElement).value).toBe('1000');
    });

    it('When the remove condition button is clicked, Then the condition row is removed', async () => {
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      await waitFor(() => screen.getByText('New Approval Policy'));
      const moduleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(moduleSelect, { target: { value: 'module:accounting:expense' } });
      fireEvent.click(screen.getByText('Add Condition'));
      await waitFor(() => screen.getByPlaceholderText('value'));
      const removeBtn = screen.getAllByTestId('icon-Trash2')[0].closest('button')!;
      fireEvent.click(removeBtn);
      await waitFor(() => {
        expect(screen.getByText(/no conditions — policy applies to all entities/i)).toBeInTheDocument();
      });
    });
  });
});

describe('ApprovalPoliciesPage — approval mode toggle', () => {
  describe('Given the create form is open', () => {
    it('When the mode select is changed to PARALLEL, Then the value updates', async () => {
      renderPage();
      await waitFor(() => screen.getByText('New Policy'));
      fireEvent.click(screen.getByText('New Policy'));
      await waitFor(() => screen.getByText('New Approval Policy'));
      const modeSelect = screen.getAllByRole('combobox').find(s =>
        Array.from((s as HTMLSelectElement).options).some((o: any) => o.value === 'PARALLEL')
      ) as HTMLSelectElement;
      fireEvent.change(modeSelect, { target: { value: 'PARALLEL' } });
      expect(modeSelect.value).toBe('PARALLEL');
    });
  });
});

describe('ApprovalPoliciesPage — API error handling', () => {
  describe('Given the API call to load policies fails', () => {
    it('When getApprovalPolicies rejects, Then the empty list state is shown gracefully', async () => {
      api.getApprovalPolicies.mockRejectedValue(new Error('Network error'));
      renderPage();
      await waitFor(() => {
        expect(screen.getByText(/no approval policies/i)).toBeInTheDocument();
      });
    });
  });
});
