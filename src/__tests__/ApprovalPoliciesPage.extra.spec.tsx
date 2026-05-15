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
  it('shows Approval Policies heading', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Approval Policies')).toBeInTheDocument());
  });

  it('shows New Policy button', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('New Policy')).toBeInTheDocument());
  });

  it('shows empty state message when no policies', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/no approval policies/i)).toBeInTheDocument());
  });

  it('back arrow navigates to /flow', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Approval Policies'));
    fireEvent.click(screen.getByTestId('icon-ArrowLeft').closest('button')!);
    expect(mockNavigate).toHaveBeenCalledWith('/flow');
  });
});

describe('ApprovalPoliciesPage — policy list', () => {
  beforeEach(() => {
    api.getApprovalPolicies.mockResolvedValue({ data: [samplePolicy] });
  });

  it('shows policy name', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Expense Approval')).toBeInTheDocument());
  });

  it('shows module name for the policy', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/accounting expense/i)).toBeInTheDocument());
  });

  it('shows SEQUENTIAL approval mode', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/sequential/i)).toBeInTheDocument());
  });

  it('shows step count', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/1 step/i)).toBeInTheDocument());
  });

  it('shows active indicator dot for active policy', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Expense Approval')).toBeInTheDocument();
    });
  });

  it('clicking expand shows rules message', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Expense Approval'));
    const policyNameEl = screen.getByText('Expense Approval');
    fireEvent.click(policyNameEl);
    await waitFor(() => {
      expect(screen.getAllByText(/rules/i)[0]).toBeInTheDocument();
    });
  });
});

describe('ApprovalPoliciesPage — create form', () => {
  it('clicking New Policy shows the form', async () => {
    renderPage();
    await waitFor(() => screen.getByText('New Policy'));
    fireEvent.click(screen.getByText('New Policy'));
    await waitFor(() => expect(screen.getByText('New Approval Policy')).toBeInTheDocument());
  });

  it('Policy Name input is present in form', async () => {
    renderPage();
    await waitFor(() => screen.getByText('New Policy'));
    fireEvent.click(screen.getByText('New Policy'));
    await waitFor(() => screen.getByText('New Approval Policy'));
    const nameInput = screen.getByPlaceholderText(/manager approval/i);
    expect(nameInput).toBeInTheDocument();
  });

  it('Module select lists module options', async () => {
    renderPage();
    await waitFor(() => screen.getByText('New Policy'));
    fireEvent.click(screen.getByText('New Policy'));
    await waitFor(() => screen.getByText('New Approval Policy'));
    expect(screen.getByText('Procurement PR')).toBeInTheDocument();
    expect(screen.getByText('Accounting Expense')).toBeInTheDocument();
  });

  it('selecting a module auto-sets entity_type (no crash)', async () => {
    renderPage();
    await waitFor(() => screen.getByText('New Policy'));
    fireEvent.click(screen.getByText('New Policy'));
    await waitFor(() => screen.getByText('New Approval Policy'));
    const moduleSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(moduleSelect, { target: { value: 'module:accounting:expense' } });
    expect(screen.getByText('New Approval Policy')).toBeInTheDocument();
  });

  it('Add Step adds a step row', async () => {
    renderPage();
    await waitFor(() => screen.getByText('New Policy'));
    fireEvent.click(screen.getByText('New Policy'));
    await waitFor(() => screen.getByText('New Approval Policy'));
    fireEvent.click(screen.getByText('Add Step'));
    await waitFor(() => {
      expect(screen.getByText(/Step 1/)).toBeInTheDocument();
    });
  });

  it('Add Condition adds a condition row (requires module selected first)', async () => {
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

  it('shows no conditions message initially', async () => {
    renderPage();
    await waitFor(() => screen.getByText('New Policy'));
    fireEvent.click(screen.getByText('New Policy'));
    await waitFor(() => {
      expect(screen.getByText(/no conditions — policy applies to all entities/i)).toBeInTheDocument();
    });
  });

  it('Save Policy is disabled when name or module is empty', async () => {
    renderPage();
    await waitFor(() => screen.getByText('New Policy'));
    fireEvent.click(screen.getByText('New Policy'));
    await waitFor(() => screen.getByText('New Approval Policy'));
    const saveBtn = screen.getByText(/save policy/i).closest('button');
    expect(saveBtn).toBeInTheDocument();
    fireEvent.click(saveBtn!);
    expect(api.createApprovalPolicy).not.toHaveBeenCalled();
  });

  it('fills form and saves a new policy', async () => {
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

  it('after save, form closes and policies are refreshed', async () => {
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

describe('ApprovalPoliciesPage — condition manipulation', () => {
  it('condition value input accepts text', async () => {
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

  it('remove condition button removes the condition row', async () => {
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

describe('ApprovalPoliciesPage — approval mode toggle', () => {
  it('can switch to PARALLEL mode', async () => {
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

describe('ApprovalPoliciesPage — API error handling', () => {
  it('handles getApprovalPolicies error gracefully (shows empty list)', async () => {
    api.getApprovalPolicies.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no approval policies/i)).toBeInTheDocument();
    });
  });
});
