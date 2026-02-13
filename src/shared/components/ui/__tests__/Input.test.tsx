import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';

describe('Input', () => {
  it('should render input field with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText(/enter text/i)).toBeInTheDocument();
  });

  it('should render with error message and hide helper text', () => {
    render(<Input error="This field is required" helperText="Helper text" />);
    expect(screen.getByText(/this field is required/i)).toBeInTheDocument();
    expect(screen.queryByText(/helper text/i)).not.toBeInTheDocument();
  });

  it('should accept user input', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Type here" />);

    const input = screen.getByPlaceholderText(/type here/i);
    await user.type(input, 'Hello World');

    expect(input).toHaveValue('Hello World');
  });

  it('should call onChange when value changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input onChange={onChange} placeholder="Type here" />);

    const input = screen.getByPlaceholderText(/type here/i);
    await user.type(input, 'a');

    expect(onChange).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled placeholder="Disabled input" />);
    expect(screen.getByPlaceholderText(/disabled input/i)).toBeDisabled();
  });

  it('should render password input type', () => {
    render(<Input type="password" placeholder="Password" />);
    const input = screen.getByPlaceholderText(/password/i);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('should associate label with input', () => {
    render(<Input id="test-input" label="Test Label" />);
    const label = screen.getByText(/test label/i);
    const input = screen.getByRole('textbox');
    expect(label).toHaveAttribute('for', 'test-input');
    expect(input).toHaveAttribute('id', 'test-input');
  });

  it('should be accessible via label click', async () => {
    const user = userEvent.setup();
    render(<Input label="Click Label" />);

    await user.click(screen.getByText(/click label/i));
    expect(screen.getByRole('textbox')).toHaveFocus();
  });
});
