/**
 * Extra coverage for FlowDashboard — navigation shortcut buttons, module-specific
 * empty state, flow description rendering, and loading spinner.
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
  flowApi: { getFlowDefinitions: vi.fn() },
}));

import { FlowDashboard } from '../pages/FlowDashboard';
import { flowApi } from '../services/flowApi';

const api = flowApi as any;

const renderPage = () => render(<MemoryRouter><FlowDashboard /></MemoryRouter>);

beforeEach(() => vi.resetAllMocks());

describe('FlowDashboard (extra)', () => {
  describe('Given flows are loaded', () => {
    beforeEach(() => {
      api.getFlowDefinitions.mockResolvedValue({
        data: [
          {
            id: 'f1',
            name: 'Expense Approval',
            module_code: 'module:accounting:expense',
            is_active: true,
            description: 'Approves expense claims',
            states: [{ code: 'draft' }],
            transitions: [],
          },
        ],
      });
    });

    it('When loaded / Then shows flow description when present', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Approves expense claims')).toBeInTheDocument());
    });

    it('When Simulator button clicked / Then navigates to /flow/simulator', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Simulator'));
      fireEvent.click(screen.getByText('Simulator'));
      expect(mockNavigate).toHaveBeenCalledWith('/flow/simulator');
    });

    it('When Approval Dashboard button clicked / Then navigates to /flow/approvals/dashboard', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Approval Dashboard'));
      fireEvent.click(screen.getByText('Approval Dashboard'));
      expect(mockNavigate).toHaveBeenCalledWith('/flow/approvals/dashboard');
    });

    it('When Pending Approvals button clicked / Then navigates to /flow/approvals/pending', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Pending Approvals'));
      fireEvent.click(screen.getByText('Pending Approvals'));
      expect(mockNavigate).toHaveBeenCalledWith('/flow/approvals/pending');
    });

    it('When Approval Policies button clicked / Then navigates to /flow/approvals/policies', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Approval Policies'));
      fireEvent.click(screen.getByText('Approval Policies'));
      expect(mockNavigate).toHaveBeenCalledWith('/flow/approvals/policies');
    });

    it('When View Instances button clicked / Then navigates to /flow/instances', async () => {
      renderPage();
      await waitFor(() => screen.getByText('View Instances'));
      fireEvent.click(screen.getByText('View Instances'));
      expect(mockNavigate).toHaveBeenCalledWith('/flow/instances');
    });

    it('When flow has 0 transitions / Then shows "0 transitions"', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('0 transitions')).toBeInTheDocument());
    });
  });

  describe('Given a module filter is selected and returns no flows', () => {
    it('When no flows for module / Then shows "No flows found for this module"', async () => {
      api.getFlowDefinitions
        .mockResolvedValueOnce({ data: [{ id: 'f1', name: 'Any', module_code: 'crm', is_active: true, description: null, states: [], transitions: [] }] })
        .mockResolvedValueOnce({ data: [] });
      renderPage();
      await waitFor(() => screen.getByText('All Modules'));
      fireEvent.change(screen.getByDisplayValue('All Modules'), {
        target: { value: 'module:crm:lead' },
      });
      await waitFor(() =>
        expect(screen.getByText('No flows found for this module')).toBeInTheDocument()
      );
    });
  });

  describe('Given flows are loading', () => {
    it('When loading / Then shows spinner', () => {
      api.getFlowDefinitions.mockReturnValue(new Promise(() => {}));
      renderPage();
      expect(document.querySelector('.animate-spin')).not.toBeNull();
    });
  });

  describe('Given flow API fails silently', () => {
    it('When API rejects / Then empty state is shown', async () => {
      api.getFlowDefinitions.mockRejectedValue(new Error('Network'));
      renderPage();
      await waitFor(() => expect(screen.getByText('No flows created yet')).toBeInTheDocument());
    });
  });
});
