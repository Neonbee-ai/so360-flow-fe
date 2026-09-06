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
    getFlowDefinitions: vi.fn(),
    getFlowDefinition: vi.fn(),
  },
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

import { FlowSimulatorPage } from '../pages/FlowSimulatorPage';
import { flowApi } from '../services/flowApi';

const mockFlowApi = flowApi as any;

const renderPage = () =>
  render(<MemoryRouter><FlowSimulatorPage /></MemoryRouter>);

const makeFlow = () => ({
  id: 'f1',
  name: 'Order Flow',
  module_code: 'crm',
  states: [
    { code: 'draft', name: 'Draft', is_initial: true, is_terminal: false, color: '#3b82f6' },
    { code: 'review', name: 'Review', is_initial: false, is_terminal: false, color: '#eab308' },
    { code: 'done', name: 'Done', is_initial: false, is_terminal: true, color: '#22c55e' },
  ],
  transitions: [
    { code: 'submit', name: 'Submit', from_state: 'draft', to_state: 'review' },
    { code: 'approve', name: 'Approve', from_state: 'review', to_state: 'done' },
  ],
});

beforeEach(() => vi.resetAllMocks());

describe('FlowSimulatorPage', () => {
  describe('Given flows are loading', () => {
    it('When page first renders / Then shows spinner', () => {
      mockFlowApi.getFlowDefinitions.mockReturnValue(new Promise(() => {}));
      renderPage();
      expect(document.querySelector('.animate-spin')).not.toBeNull();
    });
  });

  describe('Given flows have loaded', () => {
    beforeEach(() => {
      mockFlowApi.getFlowDefinitions.mockResolvedValue({
        data: [{ id: 'f1', name: 'Order Flow', module_code: 'crm' }],
      });
    });

    it('When loaded / Then shows Flow Simulator heading', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Flow Simulator')).toBeInTheDocument());
    });

    it('When loaded / Then shows flow selector', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Choose a flow to simulate...')).toBeInTheDocument());
    });

    it('When no flow is selected / Then shows Select a flow to begin', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Select a flow to begin simulation')).toBeInTheDocument());
    });
  });

  describe('Given a flow is selected', () => {
    beforeEach(() => {
      mockFlowApi.getFlowDefinitions.mockResolvedValue({
        data: [{ id: 'f1', name: 'Order Flow', module_code: 'crm' }],
      });
      mockFlowApi.getFlowDefinition.mockResolvedValue({ data: makeFlow() });
    });

    it('When flow is selected / Then shows Current State heading', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Choose a flow to simulate...'));
      fireEvent.change(screen.getByRole('combobox') as HTMLSelectElement, { target: { value: 'f1' } });
      await waitFor(() => expect(screen.getByText('Current State')).toBeInTheDocument());
    });

    it('When flow is selected / Then shows available transition Submit', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Choose a flow to simulate...'));
      fireEvent.change(screen.getByRole('combobox') as HTMLSelectElement, { target: { value: 'f1' } });
      await waitFor(() => expect(screen.getByText('Submit')).toBeInTheDocument());
    });

    it('When Submit transition is clicked / Then moves to Review state', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Choose a flow to simulate...'));
      fireEvent.change(screen.getByRole('combobox') as HTMLSelectElement, { target: { value: 'f1' } });
      await waitFor(() => screen.getByText('Submit'));
      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(screen.getByText('Approve')).toBeInTheDocument());
    });

    it('When terminal state is reached / Then shows simulation complete', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Choose a flow to simulate...'));
      fireEvent.change(screen.getByRole('combobox') as HTMLSelectElement, { target: { value: 'f1' } });
      await waitFor(() => screen.getByText('Submit'));
      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => screen.getByText('Approve'));
      fireEvent.click(screen.getByText('Approve'));
      await waitFor(() => expect(screen.getByText(/simulation complete/i)).toBeInTheDocument());
    });

    it('When Reset is clicked / Then returns to initial state', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Choose a flow to simulate...'));
      fireEvent.change(screen.getByRole('combobox') as HTMLSelectElement, { target: { value: 'f1' } });
      await waitFor(() => screen.getByText('Submit'));
      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => screen.getByText('Approve'));
      fireEvent.click(screen.getByText('Reset'));
      await waitFor(() => expect(screen.getByText('Submit')).toBeInTheDocument());
    });

    it('When transitions are taken / Then history panel shows steps', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Choose a flow to simulate...'));
      fireEvent.change(screen.getByRole('combobox') as HTMLSelectElement, { target: { value: 'f1' } });
      await waitFor(() => screen.getByText('Submit'));
      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(screen.getByText(/draft → review/i)).toBeInTheDocument());
    });
  });

  describe('Given flow definitions fail to load', () => {
    it('When API returns error / Then shows empty flow list', async () => {
      mockFlowApi.getFlowDefinitions.mockRejectedValue(new Error('Network error'));
      renderPage();
      await waitFor(() => expect(screen.getByText('Select a flow to begin simulation')).toBeInTheDocument());
    });
  });
});
