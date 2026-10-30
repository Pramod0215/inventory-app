import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

describe('legacy App entry', () => {
  it('shows the login form when there is no saved session', () => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeRequired();
  });
});
