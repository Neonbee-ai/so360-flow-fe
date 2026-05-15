import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('../services/flowApi', () => ({
  flowApi: {
    getRoles: vi.fn(),
  },
}));

import { RoleSelector } from '../components/RoleSelector';
import { flowApi } from '../services/flowApi';

const mockFlowApi = flowApi as any;

const makeRoles = () => [
  { role_id: 'r1', role_name: 'Finance Manager', user_count: 3 },
  { role_id: 'r2', role_name: 'Legal Reviewer', user_count: 1 },
  { role_id: 'r3', role_name: 'CEO', user_count: 1 },
];

describe('RoleSelector', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('Given roles are loading', () => {
    it('When API call is pending / Then select shows "Loading roles..." text', () => {
      mockFlowApi.getRoles.mockReturnValue(new Promise(() => {}));
      render(<RoleSelector value="" onChange={vi.fn()} />);
      const select = document.querySelector('select') as HTMLSelectElement;
      expect(select).toBeTruthy();
      expect(select.options[0].text).toBe('Loading roles...');
    });

    it('When API call is pending / Then select is disabled', () => {
      mockFlowApi.getRoles.mockReturnValue(new Promise(() => {}));
      render(<RoleSelector value="" onChange={vi.fn()} />);
      const select = document.querySelector('select') as HTMLSelectElement;
      expect(select.disabled).toBe(true);
    });
  });

  describe('Given roles load successfully', () => {
    beforeEach(() => {
      mockFlowApi.getRoles.mockResolvedValue({ data: makeRoles() });
    });

    it('When loaded / Then select is enabled', async () => {
      render(<RoleSelector value="" onChange={vi.fn()} />);
      await waitFor(() => {
        const select = document.querySelector('select') as HTMLSelectElement;
        expect(select.disabled).toBe(false);
      });
    });

    it('When loaded / Then shows default placeholder option', async () => {
      render(<RoleSelector value="" onChange={vi.fn()} />);
      await waitFor(() => {
        const select = document.querySelector('select') as HTMLSelectElement;
        expect(select.options[0].text).toBe('Select a role');
      });
    });

    it('When loaded / Then shows all roles as options', async () => {
      render(<RoleSelector value="" onChange={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByText('Finance Manager (3 approvers)')).toBeTruthy();
        expect(screen.getByText('Legal Reviewer (1 approver)')).toBeTruthy();
        expect(screen.getByText('CEO (1 approver)')).toBeTruthy();
      });
    });

    it('When role has 1 approver / Then shows "approver" (singular)', async () => {
      render(<RoleSelector value="" onChange={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByText('Legal Reviewer (1 approver)')).toBeTruthy();
      });
    });

    it('When role has multiple approvers / Then shows "approvers" (plural)', async () => {
      render(<RoleSelector value="" onChange={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByText('Finance Manager (3 approvers)')).toBeTruthy();
      });
    });

    it('When value prop matches a role / Then that option is selected', async () => {
      render(<RoleSelector value="r2" onChange={vi.fn()} />);
      await waitFor(() => {
        const select = document.querySelector('select') as HTMLSelectElement;
        expect(select.value).toBe('r2');
      });
    });

    it('When user selects a role / Then calls onChange with the selected role id', async () => {
      const onChange = vi.fn();
      render(<RoleSelector value="" onChange={onChange} />);
      await waitFor(() => screen.getByText('Finance Manager (3 approvers)'));
      const select = document.querySelector('select') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'r1' } });
      expect(onChange).toHaveBeenCalledWith('r1');
    });
  });

  describe('Given API returns empty roles list', () => {
    it('When no roles returned / Then only placeholder option is shown', async () => {
      mockFlowApi.getRoles.mockResolvedValue({ data: [] });
      render(<RoleSelector value="" onChange={vi.fn()} />);
      await waitFor(() => {
        const select = document.querySelector('select') as HTMLSelectElement;
        expect(select.options.length).toBe(1); // Only placeholder
        expect(select.options[0].text).toBe('Select a role');
      });
    });
  });

  describe('Given API call fails', () => {
    it('When API errors / Then falls back to empty list and enables select', async () => {
      mockFlowApi.getRoles.mockRejectedValue(new Error('Server error'));
      render(<RoleSelector value="" onChange={vi.fn()} />);
      await waitFor(() => {
        const select = document.querySelector('select') as HTMLSelectElement;
        expect(select.disabled).toBe(false);
        expect(select.options.length).toBe(1); // Only placeholder
      });
    });
  });

  describe('Given disabled prop is true', () => {
    it('When disabled=true / Then select is disabled regardless of loading state', async () => {
      mockFlowApi.getRoles.mockResolvedValue({ data: makeRoles() });
      render(<RoleSelector value="" onChange={vi.fn()} disabled={true} />);
      await waitFor(() => {
        const select = document.querySelector('select') as HTMLSelectElement;
        expect(select.disabled).toBe(true);
      });
    });
  });

  describe('Given custom placeholder is provided', () => {
    it('When placeholder prop set / Then that text appears as first option after load', async () => {
      mockFlowApi.getRoles.mockResolvedValue({ data: makeRoles() });
      render(<RoleSelector value="" onChange={vi.fn()} placeholder="Choose approver role" />);
      await waitFor(() => {
        const select = document.querySelector('select') as HTMLSelectElement;
        expect(select.options[0].text).toBe('Choose approver role');
      });
    });
  });
});
