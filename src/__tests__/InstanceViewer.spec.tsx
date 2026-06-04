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
    getFlowInstanceContext: vi.fn(),
    transitionFlowInstance: vi.fn(),
    getApprovalHistory: vi.fn(),
  },
}));

vi.mock('../components/ApprovalHistory', () => ({
  ApprovalHistory: ({ entityType, entityId }: any) =>
    <div data-testid="approval-history">{entityType}/{entityId}</div>,
}));

vi.mock('../components/FlowStateGraph', () => ({
  FlowStateGraph: () => <div data-testid="flow-state-graph">Graph</div>,
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

import { InstanceViewer } from '../pages/InstanceViewer';
import { flowApi } from '../services/flowApi';

const api = flowApi as any;

const makeContext = (overrides: any = {}) => ({
  instance: {
    id: 'i1',
    flow_id: 'f1',
    entity_type: 'deal',
    entity_id: 'd1',
    current_state: 'draft',
    started_at: '2025-05-01T00:00:00Z',
    completed_at: null,
    context: {},
    flows: {
      name: 'Deal Flow',
      module_code: 'crm',
      states: [
        { code: 'draft', name: 'Draft', is_initial: true, is_terminal: false },
        { code: 'done', name: 'Done', is_initial: false, is_terminal: true },
      ],
      transitions: [{ code: 'submit', name: 'Submit', from_state: 'draft', to_state: 'done' }],
    },
    ...overrides.instance,
  },
  history: overrides.history || [],
  available_transitions: overrides.available_transitions || [
    { code: 'submit', name: 'Submit', to_state: 'done', requires_approval: false },
  ],
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/flow/instances/i1']}>
      <Routes>
        <Route path="/flow/instances/:instanceId" element={<InstanceViewer />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => vi.resetAllMocks());

describe('InstanceViewer', () => {
  describe('Given instance loads successfully', () => {
    beforeEach(() => {
      api.getFlowInstanceContext.mockResolvedValue({ data: makeContext() });
    });

    it('When loaded / Then shows Flow Instance heading', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Flow Instance')).toBeInTheDocument());
    });

    it('When loaded / Then shows instance id', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('ID: i1')).toBeInTheDocument());
    });

    it('When loaded / Then shows flow name', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Deal Flow')).toBeInTheDocument());
    });

    it('When loaded / Then shows entity type', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('deal')).toBeInTheDocument());
    });

    it('When loaded / Then shows current state name', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Draft')).toBeInTheDocument());
    });

    it('When loaded / Then shows available transition button', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Submit')).toBeInTheDocument());
    });

    it('When loaded / Then renders FlowStateGraph', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByTestId('flow-state-graph')).toBeInTheDocument());
    });

    it('When loaded / Then renders ApprovalHistory', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByTestId('approval-history')).toBeInTheDocument());
    });
  });

  describe('Given transition is executed', () => {
    it('When transition button is clicked and confirmed / Then calls transitionFlowInstance', async () => {
      api.getFlowInstanceContext.mockResolvedValue({ data: makeContext() });
      api.transitionFlowInstance.mockResolvedValue({ data: {} });
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderPage();
      await waitFor(() => screen.getByText('Submit'));
      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(api.transitionFlowInstance).toHaveBeenCalledWith('i1', { transition_code: 'submit' }));
      vi.restoreAllMocks();
    });

    it('When transition is declined / Then does not call API', async () => {
      api.getFlowInstanceContext.mockResolvedValue({ data: makeContext() });
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderPage();
      await waitFor(() => screen.getByText('Submit'));
      fireEvent.click(screen.getByText('Submit'));
      expect(api.transitionFlowInstance).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });

  describe('Given a completed instance', () => {
    it('When completed / Then shows Completed badge', async () => {
      api.getFlowInstanceContext.mockResolvedValue({
        data: makeContext({
          instance: { completed_at: '2025-05-02T00:00:00Z', current_state: 'done' },
          available_transitions: [],
        }),
      });
      renderPage();
      await waitFor(() => expect(screen.getByText('Completed')).toBeInTheDocument());
    });

    it('When completed / Then shows no-more-transitions message', async () => {
      api.getFlowInstanceContext.mockResolvedValue({
        data: makeContext({
          instance: { completed_at: '2025-05-02T00:00:00Z', current_state: 'done' },
          available_transitions: [],
        }),
      });
      renderPage();
      await waitFor(() => expect(screen.getByText(/No more transitions/i)).toBeInTheDocument());
    });
  });

  describe('Given instance has history', () => {
    it('When history exists / Then shows transition records', async () => {
      api.getFlowInstanceContext.mockResolvedValue({
        data: makeContext({
          history: [
            { id: 'h1', from_state: null, to_state: 'draft', transitioned_at: '2025-05-01T00:00:00Z', comment: 'Started' },
          ],
        }),
      });
      renderPage();
      await waitFor(() => expect(screen.getByText('"Started"')).toBeInTheDocument());
    });
  });

  describe('Given instance has context data', () => {
    it('When context is non-empty / Then shows Instance Data section', async () => {
      api.getFlowInstanceContext.mockResolvedValue({
        data: makeContext({ instance: { context: { amount: 5000 } } }),
      });
      renderPage();
      await waitFor(() => expect(screen.getByText('Instance Data')).toBeInTheDocument());
    });
  });

  describe('Given error loading instance', () => {
    it('When API fails / Then shows error message', async () => {
      api.getFlowInstanceContext.mockRejectedValue({ response: { data: { message: 'Not found' } } });
      renderPage();
      await waitFor(() => expect(screen.getByText('Not found')).toBeInTheDocument());
    });

    it('When API fails / Then shows Back to Instances link', async () => {
      api.getFlowInstanceContext.mockRejectedValue(new Error('Fail'));
      renderPage();
      await waitFor(() => expect(screen.getByText('Back to Instances')).toBeInTheDocument());
    });
  });

  describe('Given transition with approval', () => {
    it('When transition requires approval / Then shows Requires Approval label', async () => {
      api.getFlowInstanceContext.mockResolvedValue({
        data: makeContext({
          available_transitions: [
            { code: 'submit', name: 'Submit', to_state: 'done', requires_approval: true },
          ],
        }),
      });
      renderPage();
      await waitFor(() => expect(screen.getByText('Requires Approval')).toBeInTheDocument());
    });
  });
});
