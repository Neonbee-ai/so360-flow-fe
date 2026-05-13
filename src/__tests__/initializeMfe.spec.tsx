import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const mockShellBridge = {
  currentTenant: { id: 'tenant-1', name: 'Test Tenant' },
  currentOrg: { id: 'org-1', name: 'Test Org' },
  accessToken: 'mock-token-abc',
  user: { id: 'user-1' },
};

vi.mock('@so360/shell-context', () => ({
  useShellBridge: vi.fn(() => mockShellBridge),
}));

import { MfeShellInitializer } from '../utils/initializeMfe';
import { useShellBridge } from '@so360/shell-context';

const mockUseShellBridge = useShellBridge as any;

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  mockUseShellBridge.mockReturnValue(mockShellBridge);
});

describe('MfeShellInitializer', () => {
  describe('Given the shell context provides tenant, org, and token', () => {
    it('When rendered / Then it syncs tenant/org/token/user to localStorage and renders children', async () => {
      render(
        <MfeShellInitializer>
          <div>Child Content</div>
        </MfeShellInitializer>
      );
      await waitFor(() => expect(screen.getByText('Child Content')).toBeInTheDocument());
      expect(localStorage.getItem('currentTenantId')).toBe('tenant-1');
      expect(localStorage.getItem('currentOrgId')).toBe('org-1');
      expect(localStorage.getItem('flowAuthToken')).toBe('mock-token-abc');
      expect(localStorage.getItem('userId')).toBe('user-1');
    });
  });

  describe('Given the shell context is missing tenant data', () => {
    it('When rendered / Then it shows the initializing spinner', () => {
      mockUseShellBridge.mockReturnValue({
        currentTenant: null,
        currentOrg: null,
        accessToken: null,
        user: null,
      });
      render(
        <MfeShellInitializer>
          <div>Child Content</div>
        </MfeShellInitializer>
      );
      expect(screen.getByText('Initializing Flow...')).toBeInTheDocument();
      expect(screen.queryByText('Child Content')).not.toBeInTheDocument();
    });
  });

  describe('Given the shell context has no user', () => {
    it('When rendered / Then it still syncs tenant/org/token without userId', async () => {
      mockUseShellBridge.mockReturnValue({
        currentTenant: { id: 'tenant-1' },
        currentOrg: { id: 'org-1' },
        accessToken: 'tok',
        user: null,
      });
      render(
        <MfeShellInitializer>
          <div>Child Content</div>
        </MfeShellInitializer>
      );
      await waitFor(() => expect(screen.getByText('Child Content')).toBeInTheDocument());
      expect(localStorage.getItem('userId')).toBeNull();
    });
  });
});
