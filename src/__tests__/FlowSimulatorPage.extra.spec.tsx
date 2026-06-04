/**
 * Extra coverage for FlowSimulatorPage — targets back navigation, empty
 * selector reset, and history display edge cases.
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

const api = flowApi as any;

const twoStateFlow = () => ({
  id: 'f1',
  name: 'Invoice Flow',
  module_code: 'module:accounting:invoice',
  states: [
    { code: 'open', name: 'Open', is_initial: true, is_terminal: false, color: '#3b82f6' },
    { code: 'closed', name: 'Closed', is_initial: false, is_terminal: true, color: '#22c55e' },
  ],
  transitions: [
    { code: 'close', name: 'Close', from_state: 'open', to_state: 'closed' },
  ],
});

const renderPage = () => render(<MemoryRouter><FlowSimulatorPage /></MemoryRouter>);

beforeEach(() => vi.resetAllMocks());

describe('FlowSimulatorPage (extra)', () => {
  describe('Given the back button is clicked', () => {
    it('When ArrowLeft is clicked / Then navigates to /flow', async () => {
      api.getFlowDefinitions.mockResolvedValue({ data: [] });
      renderPage();
      await waitFor(() => screen.getByText('Flow Simulator'));
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]); // first button is back button
      expect(mockNavigate).toHaveBeenCalledWith('/flow');
    });
  });

  describe('Given the selector is reset to empty after a selection', () => {
    beforeEach(() => {
      api.getFlowDefinitions.mockResolvedValue({
        data: [{ id: 'f1', name: 'Invoice Flow', module_code: 'module:accounting:invoice' }],
      });
      api.getFlowDefinition.mockResolvedValue({ data: twoStateFlow() });
    });

    it('When flow is deselected / Then hides the state machine panels', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Choose a flow to simulate...'));
      const sel = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(sel, { target: { value: 'f1' } });
      await waitFor(() => screen.getByText('Current State'));
      fireEvent.change(sel, { target: { value: '' } });
      await waitFor(() => expect(screen.queryByText('Current State')).not.toBeInTheDocument());
    });

    it('When flow is deselected / Then shows Select a flow prompt again', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Choose a flow to simulate...'));
      const sel = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(sel, { target: { value: 'f1' } });
      await waitFor(() => screen.getByText('Current State'));
      fireEvent.change(sel, { target: { value: '' } });
      await waitFor(() =>
        expect(screen.getByText('Select a flow to begin simulation')).toBeInTheDocument()
      );
    });
  });

  describe('Given a flow with a terminal initial state', () => {
    it('When no transitions available from initial state / Then shows no-transitions message', async () => {
      api.getFlowDefinitions.mockResolvedValue({
        data: [{ id: 'f2', name: 'Dead Flow', module_code: 'crm' }],
      });
      api.getFlowDefinition.mockResolvedValue({
        data: {
          id: 'f2',
          name: 'Dead Flow',
          module_code: 'crm',
          states: [{ code: 'stuck', name: 'Stuck', is_initial: true, is_terminal: false, color: '#ef4444' }],
          transitions: [],
        },
      });
      renderPage();
      await waitFor(() => screen.getByText('Choose a flow to simulate...'));
      fireEvent.change(screen.getByRole('combobox') as HTMLSelectElement, { target: { value: 'f2' } });
      await waitFor(() =>
        expect(screen.getByText('No transitions available from this state')).toBeInTheDocument()
      );
    });
  });

  describe('Given multiple transitions are taken', () => {
    beforeEach(() => {
      api.getFlowDefinitions.mockResolvedValue({
        data: [{ id: 'f1', name: 'Invoice Flow', module_code: 'accounting' }],
      });
      api.getFlowDefinition.mockResolvedValue({ data: twoStateFlow() });
    });

    it('When Close transition applied / Then history shows the "current" marker', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Choose a flow to simulate...'));
      fireEvent.change(screen.getByRole('combobox') as HTMLSelectElement, { target: { value: 'f1' } });
      await waitFor(() => screen.getByText('Close'));
      fireEvent.click(screen.getByText('Close'));
      await waitFor(() => expect(screen.getByText(/closed \(current\)/i)).toBeInTheDocument());
    });

    it('When terminal reached and Reset clicked / Then history is cleared', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Choose a flow to simulate...'));
      fireEvent.change(screen.getByRole('combobox') as HTMLSelectElement, { target: { value: 'f1' } });
      await waitFor(() => screen.getByText('Close'));
      fireEvent.click(screen.getByText('Close'));
      await waitFor(() => screen.getByText('Reset'));
      fireEvent.click(screen.getByText('Reset'));
      await waitFor(() =>
        expect(screen.getByText('No transitions yet. Click a transition to simulate.')).toBeInTheDocument()
      );
    });
  });

  describe('Given getFlowDefinition fails after selection', () => {
    it('When flow detail fetch errors / Then simulation panel is not shown', async () => {
      api.getFlowDefinitions.mockResolvedValue({
        data: [{ id: 'bad', name: 'Bad Flow', module_code: 'crm' }],
      });
      api.getFlowDefinition.mockRejectedValue(new Error('Not found'));
      renderPage();
      await waitFor(() => screen.getByText('Choose a flow to simulate...'));
      fireEvent.change(screen.getByRole('combobox') as HTMLSelectElement, { target: { value: 'bad' } });
      await waitFor(() =>
        expect(screen.queryByText('Current State')).not.toBeInTheDocument()
      );
    });
  });
});
