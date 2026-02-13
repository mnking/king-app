import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useAuthStore } from '../useAuthStore';
import type { Role } from '@/config/rbac/roles';

describe('useAuthStore RBAC', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.setState({
        roles: [],
        permissions: [],
        user: null,
        isAuthenticated: false,
      });
    });
  });

  it('adds implied read when write permission present', () => {
    const roles: Role[] = ['cfs_commercial'];
    act(() => useAuthStore.getState().setUser({ id: '1', email: 't', roles } as any));
    const perms = useAuthStore.getState().permissions;
    expect(perms).toContain('hbl_management:write');
    expect(perms).toContain('hbl_management:read');
    expect(perms).toContain('packing_list_management:read');
  });

  it('unions permissions across roles', () => {
    const roles: Role[] = ['cfs_commercial', 'cfs_wh_staff'];
    act(() => useAuthStore.getState().setUser({ id: '1', email: 't', roles } as any));
    const perms = useAuthStore.getState().permissions;
    expect(perms).toContain('cargo_delivery:write');
    expect(perms).toContain('destuff_order_management:write');
  });

  it('falls back to default role when none provided', () => {
    act(() => useAuthStore.getState().setUser({ id: '1', email: 't', roles: [] } as any));
    const perms = useAuthStore.getState().permissions;
    expect(perms).toContain('hbl_management:read');
    expect(perms).toContain('packing_list_management:read');
  });

  it('can() returns true for wildcard', () => {
    act(() =>
      useAuthStore.setState({
        permissions: ['*'],
      }),
    );
    expect(useAuthStore.getState().can('anything:read')).toBe(true);
  });

  it('can() checks explicit permission', () => {
    act(() =>
      useAuthStore.setState({
        permissions: ['packing_list_management:read'],
      }),
    );
    expect(useAuthStore.getState().can('packing_list_management:read')).toBe(true);
    expect(useAuthStore.getState().can('packing_list_management:write')).toBe(false);
  });

  it('accepts canonical cfs_planner role', () => {
    const roles = ['cfs_planner'] as any;
    act(() => useAuthStore.getState().setUser({ id: '1', email: 't', roles } as any));
    const storedRoles = useAuthStore.getState().roles;
    expect(storedRoles).toContain('cfs_planner');
  });
});
