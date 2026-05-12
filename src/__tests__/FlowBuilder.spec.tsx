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

const mockFlowApi = flowApi as any;

const renderNew = () =>
  render(
    <MemoryRouter initialEntries={['/flow/builder/new']}>
      <Routes>
        <Route path="/flow/builder/:flowId" element={<FlowBuilder />} />
      </Routes>
    </MemoryRouter>
  );

const renderExisting = () => {
  mockFlowApi.getFlowDefinition.mockResolvedValue({
    data: {
      id: 'f1', name: 'Test Flow', description: 'A test', module_code: 'module:crm:lead',
      states: [{ code: 'draft', name: 'Draft', is_initial: true, is_terminal: false, color: '#94a3b8' }],
      transitions: [{ code: 'submit', name: 'Submit', from_state: 'draft', to_state: 'review' }],
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

beforeEach(() => vi.resetAllMocks());

describe('FlowBuilder', () => {
  describe('Given a new flow is being created', () => {
    it('When the page loads / Then it shows the Flow Information section', () => {
      renderNew();
      expect(screen.getByText('Flow Information')).toBeInTheDocument();
    });

    it('When the page loads / Then the save button is disabled without required fields', () => {
      renderNew();
      const saveBtn = screen.getByText('Save Flow').closest('button');
      expect(saveBtn).toBeDisabled();
    });

    it('When the Add State button is clicked / Then a new state row appears', () => {
      renderNew();
      fireEvent.click(screen.getByText('Add State'));
      expect(screen.getAllByPlaceholderText('e.g., draft').length).toBe(1);
    });

    it('When the Add Transition button is clicked / Then a new transition row appears', () => {
      renderNew();
      fireEvent.click(screen.getByText('Add Transition'));
      expect(screen.getAllByText('Select State').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Given an existing flow is loaded', () => {
    it('When the page loads / Then it shows the flow name', async () => {
      renderExisting();
      await waitFor(() => expect(screen.getByDisplayValue('Test Flow')).toBeInTheDocument());
    });

    it('When the page loads / Then it shows existing states', async () => {
      renderExisting();
      await waitFor(() => expect(screen.getByDisplayValue('draft')).toBeInTheDocument());
      expect(screen.getAllByDisplayValue('Draft').length).toBeGreaterThan(0);
    });

    it('When the page loads / Then it shows existing transitions', async () => {
      renderExisting();
      await waitFor(() => expect(screen.getByDisplayValue('submit')).toBeInTheDocument());
    });

    it('When the Back button is clicked / Then it navigates to the dashboard', async () => {
      renderExisting();
      await waitFor(() => expect(screen.getByText('Back to Flows')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Back to Flows'));
      expect(mockNavigate).toHaveBeenCalledWith('/flow');
    });
  });
});
