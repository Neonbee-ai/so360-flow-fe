import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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

beforeEach(() => vi.resetAllMocks());

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
});
