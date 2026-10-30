import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthForm } from '../../src/components/AuthForm.jsx';
import ProductCard from '../../src/components/ProductCard.jsx';

describe('AuthForm', () => {
  const props = {
    isLogin: true,
    formData: { name: '', email: '', password: '', confirmPassword: '' },
    loading: false,
    message: { type: '', text: '' },
    onChange: vi.fn(),
    onSubmit: vi.fn((event) => event.preventDefault()),
    onToggleMode: vi.fn(),
  };

  it('renders the login form and reports mode changes', () => {
    render(<AuthForm {...props} />);

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeRequired();
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));
    expect(props.onToggleMode).toHaveBeenCalledWith(false);
  });

  it('renders registration fields, status feedback, and loading state', () => {
    render(
      <AuthForm
        {...props}
        isLogin={false}
        loading
        message={{ type: 'error', text: 'Passwords do not match.' }}
      />
    );

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toBeRequired();
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Please wait...' })).toBeDisabled();
  });
});

describe('ProductCard', () => {
  it('shows product details and accessible image text', () => {
    render(
      <ProductCard
        product={{
          name: 'PVC Pipe',
          brand: 'FlowPro',
          quantity: 3,
          price: 120,
          image: '/pipe.jpg',
        }}
      />
    );

    expect(screen.getByRole('heading', { name: 'PVC Pipe' })).toBeInTheDocument();
    expect(screen.getByText('FlowPro')).toBeInTheDocument();
    expect(screen.getByText('Qty: 3')).toBeInTheDocument();
    expect(screen.getByText('₹120')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'PVC Pipe' })).toHaveAttribute('src', '/pipe.jpg');
  });
});
