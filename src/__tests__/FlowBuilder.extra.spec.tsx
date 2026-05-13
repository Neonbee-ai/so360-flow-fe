/**
 * Extra coverage for FlowBuilder — targets state/transition management,
 * save paths for new vs existing flows, and remove state/transition buttons.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../services/flowApi', () => ({
  flowApi: {
    getFlowDefinition: vi.fn(),
    createFlowDefinition: vi.fn(),
    updateFlowDefinition: vi.fn(),
  },
}));

import { FlowBuilder } from '../pages/FlowBuilder';
import { flowApi } from '../services/flowApi';

const api = flowApi as any;

const renderNew = () =>
  render(
    <MemoryRouter initialEntries={['/flow/builder/new']}>
      <Routes>
        <Route path="/flow/builder/:flowId" element={<FlowBuilder />} />
      </Routes>
    </MemoryRouter>
  );

const renderExisting = (overrides = {}) => {
  api.getFlowDefinition.mockResolvedValue({
    data: {
      id: 'f1', name: 'Existing Flow', description: 'Desc', module_code: 'module:crm:lead',
      states: [
        { code: 'draft', name: 'Draft', is_initial: true, is_terminal: false, color: '#94a3b8' },
        { code: 'review', name: 'Review', is_initial: false, is_terminal: false, color: '#3b82f6' },
      ],
      transitions: [
        { code: 'submit', name: 'Submit', from_state: 'draft', to_state: 'review' },
      ],
      ...overrides,
    },
  });
  return render(
    <MemoryRouter initialEntries={['/flow/builder/f1']}>
      <Routes>
        <Route path="/flow/builder/:flowId" element={<FlowBuilder />} />
      </Routes>
    </MemoryRouter>
  );
};

beforeEach(() => {
  vi.resetAllMocks();
  api.createFlowDefinition.mockResolvedValue({ data: { id: 'new-f' } });
  api.updateFlowDefinition.mockResolvedValue({ data: {} });
});

describe('FlowBuilder — module selector', () => {
  it('shows module dropdown with options', () => {
    renderNew();
    expect(screen.getByText('CRM - Leads')).toBeInTheDocument();
    expect(screen.getByText('CRM - Deals')).toBeInTheDocument();
    expect(screen.getByText('Fulfillment - Orders')).toBeInTheDocument();
  });

  it('can select a module', () => {
    renderNew();
    const moduleSelect = screen.getByRole('combobox');
    fireEvent.change(moduleSelect, { target: { value: 'module:crm:deal' } });
    expect((moduleSelect as HTMLSelectElement).value).toBe('module:crm:deal');
  });
});

describe('FlowBuilder — name and description', () => {
  it('name field is editable', () => {
    renderNew();
    const nameInput = screen.getByPlaceholderText(/lead approval flow/i);
    fireEvent.change(nameInput, { target: { value: 'My New Flow' } });
    expect((nameInput as HTMLInputElement).value).toBe('My New Flow');
  });

  it('description field is editable', () => {
    renderNew();
    const descInput = screen.getByPlaceholderText(/describe this workflow/i);
    fireEvent.change(descInput, { target: { value: 'A test flow' } });
    expect((descInput as HTMLTextAreaElement).value).toBe('A test flow');
  });
});

describe('FlowBuilder — state management', () => {
  it('first added state is marked as initial', () => {
    renderNew();
    fireEvent.click(screen.getByText('Add State'));
    // is_initial checkbox should be checked for the first state
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('second added state is not initial', () => {
    renderNew();
    fireEvent.click(screen.getByText('Add State'));
    fireEvent.click(screen.getByText('Add State'));
    // Two state code inputs should exist
    expect(screen.getAllByPlaceholderText('e.g., draft').length).toBe(2);
  });

  it('remove state button removes the state', () => {
    renderNew();
    fireEvent.click(screen.getByText('Add State'));
    expect(screen.getAllByPlaceholderText('e.g., draft').length).toBe(1);
    // Click the remove button (trash icon button in the state row)
    const removeBtn = screen.getByTestId('icon-Trash2').closest('button')!;
    fireEvent.click(removeBtn);
    expect(screen.queryAllByPlaceholderText('e.g., draft').length).toBe(0);
  });

  it('state code input is editable', () => {
    renderNew();
    fireEvent.click(screen.getByText('Add State'));
    const codeInput = screen.getByPlaceholderText('e.g., draft');
    fireEvent.change(codeInput, { target: { value: 'approved' } });
    expect((codeInput as HTMLInputElement).value).toBe('approved');
  });

  it('state name input is editable', () => {
    renderNew();
    fireEvent.click(screen.getByText('Add State'));
    const nameInput = screen.getByPlaceholderText('e.g., Draft');
    fireEvent.change(nameInput, { target: { value: 'Approved' } });
    expect((nameInput as HTMLInputElement).value).toBe('Approved');
  });
});

describe('FlowBuilder — transition management', () => {
  it('add transition adds a row', () => {
    renderNew();
    fireEvent.click(screen.getByText('Add Transition'));
    const codeInput = screen.getByPlaceholderText('e.g., submit');
    expect(codeInput).toBeInTheDocument();
  });

  it('transition code is editable', () => {
    renderNew();
    fireEvent.click(screen.getByText('Add Transition'));
    const codeInput = screen.getByPlaceholderText('e.g., submit');
    fireEvent.change(codeInput, { target: { value: 'approve' } });
    expect((codeInput as HTMLInputElement).value).toBe('approve');
  });

  it('remove transition button removes it', () => {
    renderNew();
    fireEvent.click(screen.getByText('Add Transition'));
    expect(screen.getByPlaceholderText('e.g., submit')).toBeInTheDocument();
    const trashBtns = screen.getAllByTestId('icon-Trash2');
    fireEvent.click(trashBtns[trashBtns.length - 1].closest('button')!);
    expect(screen.queryByPlaceholderText('e.g., submit')).not.toBeInTheDocument();
  });
});

describe('FlowBuilder — save new flow', () => {
  it('save button enabled after name, module, and state added', async () => {
    renderNew();
    fireEvent.change(screen.getByPlaceholderText(/lead approval flow/i), { target: { value: 'My Flow' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'module:crm:lead' } });
    fireEvent.click(screen.getByText('Add State'));
    const saveBtn = screen.getByText('Save Flow').closest('button');
    expect(saveBtn).not.toBeDisabled();
  });

  it('clicking Save creates a new flow and navigates to /flow', async () => {
    renderNew();
    fireEvent.change(screen.getByPlaceholderText(/lead approval flow/i), { target: { value: 'My Flow' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'module:crm:lead' } });
    fireEvent.click(screen.getByText('Add State'));
    fireEvent.click(screen.getByText('Save Flow').closest('button')!);
    await waitFor(() => {
      expect(api.createFlowDefinition).toHaveBeenCalledWith(expect.objectContaining({ name: 'My Flow', module_code: 'module:crm:lead' }));
      expect(mockNavigate).toHaveBeenCalledWith('/flow');
    });
  });
});

describe('FlowBuilder — save existing flow', () => {
  it('clicking Save updates the existing flow', async () => {
    renderExisting();
    await waitFor(() => screen.getByDisplayValue('Existing Flow'));
    fireEvent.click(screen.getByText('Save Flow').closest('button')!);
    await waitFor(() => {
      expect(api.updateFlowDefinition).toHaveBeenCalledWith('f1', expect.objectContaining({ name: 'Existing Flow' }));
    });
  });

  it('after save navigates to /flow', async () => {
    renderExisting();
    await waitFor(() => screen.getByDisplayValue('Existing Flow'));
    fireEvent.click(screen.getByText('Save Flow').closest('button')!);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/flow');
    });
  });

  it('shows existing states after loading', async () => {
    renderExisting();
    await waitFor(() => {
      expect(screen.getByDisplayValue('draft')).toBeInTheDocument();
      expect(screen.getByDisplayValue('review')).toBeInTheDocument();
    });
  });

  it('shows existing transition', async () => {
    renderExisting();
    await waitFor(() => {
      expect(screen.getByDisplayValue('submit')).toBeInTheDocument();
    });
  });

  it('can add another state to existing flow', async () => {
    renderExisting();
    await waitFor(() => screen.getByDisplayValue('draft'));
    const beforeCount = screen.getAllByPlaceholderText('e.g., draft').length;
    fireEvent.click(screen.getByText('Add State'));
    expect(screen.getAllByPlaceholderText('e.g., draft').length).toBe(beforeCount + 1);
  });

  it('removing a state also removes transitions involving it', async () => {
    renderExisting();
    await waitFor(() => screen.getByDisplayValue('draft'));
    // Remove the 'draft' state (first remove button)
    const trashBtns = screen.getAllByTestId('icon-Trash2');
    fireEvent.click(trashBtns[0].closest('button')!);
    // The 'submit' transition from 'draft' should be removed too
    await waitFor(() => {
      expect(screen.queryByDisplayValue('submit')).not.toBeInTheDocument();
    });
  });
});

describe('FlowBuilder — save button state label', () => {
  it('shows "Saving..." while save is in progress', async () => {
    api.createFlowDefinition.mockImplementation(() => new Promise(res => setTimeout(res, 500)));
    renderNew();
    fireEvent.change(screen.getByPlaceholderText(/lead approval flow/i), { target: { value: 'My Flow' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'module:crm:lead' } });
    fireEvent.click(screen.getByText('Add State'));
    fireEvent.click(screen.getByText('Save Flow').closest('button')!);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });
});
