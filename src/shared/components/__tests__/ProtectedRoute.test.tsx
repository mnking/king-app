import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '../ProtectedRoute';
import { useAuth } from '@/features/auth/useAuth';

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

const renderWithRouter = (ui: React.ReactElement, initialEntries = ['/protected']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div>login-page</div>} />
        <Route path="/protected" element={ui} />
      </Routes>
    </MemoryRouter>,
  );

describe('ProtectedRoute', () => {
  it('shows loading while initializing', () => {
    mockedUseAuth.mockReturnValue({
      loading: true,
      initialized: false,
      isAuthenticated: false,
      user: null,
      profile: null,
      can: vi.fn().mockReturnValue(false),
    } as any);

    renderWithRouter(
      <ProtectedRoute>
        <div>protected</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('redirects to login when unauthenticated after init', () => {
    mockedUseAuth.mockReturnValue({
      loading: false,
      initialized: true,
      isAuthenticated: false,
      user: null,
      profile: null,
      can: vi.fn().mockReturnValue(false),
    } as any);

    renderWithRouter(
      <ProtectedRoute>
        <div>protected</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('login-page')).toBeInTheDocument();
  });

  it('renders children when authorized', () => {
    mockedUseAuth.mockReturnValue({
      loading: false,
      initialized: true,
      isAuthenticated: true,
      user: { id: '1' },
      profile: { roles: [] },
      can: vi.fn().mockReturnValue(true),
    } as any);

    renderWithRouter(
      <ProtectedRoute requiredPermissions={['hbl_management:read']}>
        <div>protected-content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('protected-content')).toBeInTheDocument();
  });

  it('shows access denied when missing permission', () => {
    mockedUseAuth.mockReturnValue({
      loading: false,
      initialized: true,
      isAuthenticated: true,
      user: { id: '1' },
      profile: { roles: [] },
      can: vi.fn().mockReturnValue(false),
    } as any);

    renderWithRouter(
      <ProtectedRoute requiredPermissions={['hbl_management:read']}>
        <div>protected-content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
  });
});
