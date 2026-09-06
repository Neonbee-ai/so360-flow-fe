import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Entitlements default to unrestricted so the routing/flag specs exercise those
// behaviours alone; the permission specs below drive this down to a real code set.
const unrestrictedBridge = () => ({
  isFeatureHidden: () => false,
  permissionsLoaded: true,
  hasPermission: () => true,
  hasAnyPermission: () => true,
});

let mockShellBridge: any = unrestrictedBridge();

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
  mockShellBridge = unrestrictedBridge();
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

  describe('Given a page gated on role permissions', () => {
    const bridgeWith = (codes: string[], permissionsLoaded = true) => ({
      isFeatureHidden: () => false,
      getFeatureState: () => 'enabled',
      permissionsLoaded,
      hasPermission: (c: string) => codes.includes(c),
      hasAnyPermission: (...cs: string[]) => cs.some((c) => codes.includes(c)),
    });

    it('When the user holds the page code / Then the page renders', () => {
      mockShellBridge = bridgeWith(['instances.view']);
      render(<MemoryRouter initialEntries={['/instances']}><App /></MemoryRouter>);
      expect(screen.getByText('InstanceList')).toBeInTheDocument();
    });

    it('When the user lacks the page code / Then the page is withheld with a notice', () => {
      mockShellBridge = bridgeWith(['workflows.read']);
      render(<MemoryRouter initialEntries={['/instances']}><App /></MemoryRouter>);
      expect(screen.getByText(/don't have access to this page/i)).toBeInTheDocument();
      expect(screen.queryByText('InstanceList')).not.toBeInTheDocument();
    });

    it('When entitlements have not resolved / Then no denial flashes', () => {
      mockShellBridge = bridgeWith([], false);
      render(<MemoryRouter initialEntries={['/instances']}><App /></MemoryRouter>);
      expect(screen.queryByText('InstanceList')).not.toBeInTheDocument();
      expect(screen.queryByText(/don't have access/i)).not.toBeInTheDocument();
    });

    it('When the landing route is opened with no page codes / Then it stays reachable', () => {
      mockShellBridge = bridgeWith([]);
      render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);
      expect(screen.getByText('FlowDashboard')).toBeInTheDocument();
      expect(screen.queryByText(/don't have access/i)).not.toBeInTheDocument();
    });

    it('When the plan flag is locked AND the code is missing / Then the permission notice wins over the upgrade prompt', () => {
      mockShellBridge = { ...bridgeWith([]), getFeatureState: () => 'locked' };
      render(<MemoryRouter initialEntries={['/instances']}><App /></MemoryRouter>);
      expect(screen.getByText(/don't have access to this page/i)).toBeInTheDocument();
      expect(screen.queryByText(/upgrade plan/i)).not.toBeInTheDocument();
    });
  });

  describe('Given FlagGuard on advanced-flow routes (5-state model)', () => {
    describe('When submodule:flow:advanced is enabled', () => {
      it('When navigating to /instance/:id / Then InstanceViewer is rendered', () => {
        mockShellBridge = { permissionsLoaded: true, hasPermission: () => true, hasAnyPermission: () => true, getFeatureState: () => 'enabled' };
        render(<MemoryRouter initialEntries={['/instance/i1']}><App /></MemoryRouter>);
        expect(screen.getByText('InstanceViewer')).toBeInTheDocument();
      });

      it('When navigating to /instances / Then InstanceList is rendered', () => {
        mockShellBridge = { permissionsLoaded: true, hasPermission: () => true, hasAnyPermission: () => true, getFeatureState: () => 'enabled' };
        render(<MemoryRouter initialEntries={['/instances']}><App /></MemoryRouter>);
        expect(screen.getByText('InstanceList')).toBeInTheDocument();
      });
    });

    describe('When submodule:flow:advanced is hidden', () => {
      it('When navigating to /instance/:id / Then redirects to FlowDashboard', async () => {
        mockShellBridge = { permissionsLoaded: true, hasPermission: () => true, hasAnyPermission: () => true, getFeatureState: (key: string) => key === 'submodule:flow:advanced' ? 'hidden' : 'enabled' };
        render(<MemoryRouter initialEntries={['/instance/i1']}><App /></MemoryRouter>);
        await waitFor(() => {
          expect(screen.getByText('FlowDashboard')).toBeInTheDocument();
          expect(screen.queryByText('InstanceViewer')).not.toBeInTheDocument();
        });
      });

      it('When navigating to /instances / Then redirects to FlowDashboard', async () => {
        mockShellBridge = { permissionsLoaded: true, hasPermission: () => true, hasAnyPermission: () => true, getFeatureState: (key: string) => key === 'submodule:flow:advanced' ? 'hidden' : 'enabled' };
        render(<MemoryRouter initialEntries={['/instances']}><App /></MemoryRouter>);
        await waitFor(() => {
          expect(screen.getByText('FlowDashboard')).toBeInTheDocument();
          expect(screen.queryByText('InstanceList')).not.toBeInTheDocument();
        });
      });
    });

    describe('When submodule:flow:advanced is locked', () => {
      it('When navigating to /instances / Then the upgrade prompt is shown instead of the page', () => {
        mockShellBridge = { permissionsLoaded: true, hasPermission: () => true, hasAnyPermission: () => true, getFeatureState: () => 'locked' };
        render(<MemoryRouter initialEntries={['/instances']}><App /></MemoryRouter>);
        expect(screen.getByText(/upgrade plan/i)).toBeInTheDocument();
        expect(screen.queryByText('InstanceList')).not.toBeInTheDocument();
      });
    });

    describe('When submodule:flow:advanced is disabled', () => {
      it('When navigating to /instances / Then the unavailable panel is shown and NO upgrade prompt', () => {
        mockShellBridge = { permissionsLoaded: true, hasPermission: () => true, hasAnyPermission: () => true, getFeatureState: () => 'disabled' };
        render(<MemoryRouter initialEntries={['/instances']}><App /></MemoryRouter>);
        expect(screen.getByText(/feature unavailable/i)).toBeInTheDocument();
        expect(screen.queryByText(/upgrade plan/i)).not.toBeInTheDocument();
        expect(screen.queryByText('InstanceList')).not.toBeInTheDocument();
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
