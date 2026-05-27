import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let mockShellBridge: any = { isFeatureHidden: () => false };

vi.mock('@so360/shell-context', () => ({
  useShellBridge: () => mockShellBridge,
}));

vi.mock('../utils/initializeMfe', () => ({
  MfeShellInitializer: ({ children }: any) => <div data-testid="mfe-init">{children}</div>,
}));

vi.mock('../pages/FlowDashboard', () => ({
  FlowDashboard: () => <div>FlowDashboard</div>,
}));
vi.mock('../pages/FlowBuilder', () => ({
  FlowBuilder: () => <div>FlowBuilder</div>,
}));
vi.mock('../pages/PendingApprovals', () => ({
  PendingApprovals: () => <div>PendingApprovals</div>,
}));
vi.mock('../pages/ApprovalPoliciesPage', () => ({
  ApprovalPoliciesPage: () => <div>ApprovalPoliciesPage</div>,
}));
vi.mock('../pages/InstanceViewer', () => ({
  InstanceViewer: () => <div>InstanceViewer</div>,
}));
vi.mock('../pages/InstanceList', () => ({
  InstanceList: () => <div>InstanceList</div>,
}));
vi.mock('../pages/FlowSimulatorPage', () => ({
  FlowSimulatorPage: () => <div>FlowSimulatorPage</div>,
}));

import App from '../App';

beforeEach(() => {
  vi.resetAllMocks();
  mockShellBridge = { isFeatureHidden: () => false };
});

describe('App', () => {
  describe('Given the MFE shell is initialized', () => {
    it('When navigating to / / Then FlowDashboard is rendered', () => {
      render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);
      expect(screen.getByText('FlowDashboard')).toBeInTheDocument();
    });

    it('When navigating to /builder/:flowId / Then FlowBuilder is rendered', () => {
      render(<MemoryRouter initialEntries={['/builder/f1']}><App /></MemoryRouter>);
      expect(screen.getByText('FlowBuilder')).toBeInTheDocument();
    });

    it('When navigating to /approvals/pending / Then PendingApprovals is rendered', () => {
      render(<MemoryRouter initialEntries={['/approvals/pending']}><App /></MemoryRouter>);
      expect(screen.getByText('PendingApprovals')).toBeInTheDocument();
    });

    it('When navigating to /approvals/policies / Then ApprovalPoliciesPage is rendered', () => {
      render(<MemoryRouter initialEntries={['/approvals/policies']}><App /></MemoryRouter>);
      expect(screen.getByText('ApprovalPoliciesPage')).toBeInTheDocument();
    });

    it('When navigating to /instance/:id / Then InstanceViewer is rendered', () => {
      render(<MemoryRouter initialEntries={['/instance/i1']}><App /></MemoryRouter>);
      expect(screen.getByText('InstanceViewer')).toBeInTheDocument();
    });

    it('When navigating to /instances / Then InstanceList is rendered', () => {
      render(<MemoryRouter initialEntries={['/instances']}><App /></MemoryRouter>);
      expect(screen.getByText('InstanceList')).toBeInTheDocument();
    });

    it('When navigating to /simulator / Then FlowSimulatorPage is rendered', () => {
      render(<MemoryRouter initialEntries={['/simulator']}><App /></MemoryRouter>);
      expect(screen.getByText('FlowSimulatorPage')).toBeInTheDocument();
    });

    it('When navigating to an unknown route / Then it redirects to FlowDashboard', () => {
      render(<MemoryRouter initialEntries={['/nonexistent']}><App /></MemoryRouter>);
      expect(screen.getByText('FlowDashboard')).toBeInTheDocument();
    });
  });

  describe('Given FlagGuard on advanced-flow routes', () => {
    describe('When submodule:flow:advanced is NOT hidden', () => {
      it('When navigating to /instance/:id / Then InstanceViewer is rendered', () => {
        mockShellBridge = { isFeatureHidden: () => false };
        render(<MemoryRouter initialEntries={['/instance/i1']}><App /></MemoryRouter>);
        expect(screen.getByText('InstanceViewer')).toBeInTheDocument();
      });

      it('When navigating to /instances / Then InstanceList is rendered', () => {
        mockShellBridge = { isFeatureHidden: () => false };
        render(<MemoryRouter initialEntries={['/instances']}><App /></MemoryRouter>);
        expect(screen.getByText('InstanceList')).toBeInTheDocument();
      });
    });

    describe('When submodule:flow:advanced IS hidden', () => {
      it('When navigating to /instance/:id / Then redirects to FlowDashboard', async () => {
        mockShellBridge = { isFeatureHidden: (key: string) => key === 'submodule:flow:advanced' };
        render(<MemoryRouter initialEntries={['/instance/i1']}><App /></MemoryRouter>);
        await waitFor(() => {
          expect(screen.getByText('FlowDashboard')).toBeInTheDocument();
          expect(screen.queryByText('InstanceViewer')).not.toBeInTheDocument();
        });
      });

      it('When navigating to /instances / Then redirects to FlowDashboard', async () => {
        mockShellBridge = { isFeatureHidden: (key: string) => key === 'submodule:flow:advanced' };
        render(<MemoryRouter initialEntries={['/instances']}><App /></MemoryRouter>);
        await waitFor(() => {
          expect(screen.getByText('FlowDashboard')).toBeInTheDocument();
          expect(screen.queryByText('InstanceList')).not.toBeInTheDocument();
        });
      });
    });

    describe('When shell bridge is not yet available (null)', () => {
      it('When navigating to /instance/:id / Then renders nothing (FlagGuard returns null while shell loads)', () => {
        mockShellBridge = null;
        render(<MemoryRouter initialEntries={['/instance/i1']}><App /></MemoryRouter>);
        expect(screen.queryByText('InstanceViewer')).not.toBeInTheDocument();
      });
    });
  });
});
