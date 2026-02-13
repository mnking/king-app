import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { FormSingleSelect } from '../FormSingleSelect';
import type { ReactElement } from 'react';

// Test wrapper component with React Hook Form
const TestWrapper = ({
  defaultValue = '',
  label,
  required = false,
  disabled = false,
  onSubmit = vi.fn(),
}: {
  defaultValue?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  onSubmit?: (data: any) => void;
}): ReactElement => {
  const { control, handleSubmit } = useForm({
    defaultValues: { testField: defaultValue },
  });

  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormSingleSelect
        name="testField"
        control={control}
        options={options}
        label={label}
        required={required}
        disabled={disabled}
      />
      <button type="submit">Submit</button>
    </form>
  );
};

describe('FormSingleSelect', () => {
  it('should render dropdown button with placeholder', () => {
    render(<TestWrapper />);
    const button = screen.getByRole('button', { name: /select dropdown/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Select an option...');
  });

  it('should render with label and required indicator', () => {
    render(<TestWrapper label="Required Field" required />);
    const label = screen.getByText(/required field/i);
    expect(label).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should open dropdown when clicked', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const button = screen.getByRole('button', { name: /select dropdown/i });
    await user.click(button);

    // Check if dropdown menu is visible
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
  });

  it('should show search input when dropdown is open', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const button = screen.getByRole('button', { name: /select dropdown/i });
    await user.click(button);

    // Check for search input
    const searchInput = screen.getByPlaceholderText('Search options...');
    expect(searchInput).toBeInTheDocument();
  });

  it('should display all options in dropdown', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const button = screen.getByRole('button', { name: /select dropdown/i });
    await user.click(button);

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByText('Option 1')).toBeInTheDocument();
    expect(within(listbox).getByText('Option 2')).toBeInTheDocument();
    expect(within(listbox).getByText('Option 3')).toBeInTheDocument();
  });

  it('should filter options based on search input', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const button = screen.getByRole('button', { name: /select dropdown/i });
    await user.click(button);

    const searchInput = screen.getByPlaceholderText('Search options...');
    await user.type(searchInput, 'Option 1');

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByText('Option 1')).toBeInTheDocument();
    expect(within(listbox).queryByText('Option 2')).not.toBeInTheDocument();
    expect(within(listbox).queryByText('Option 3')).not.toBeInTheDocument();
  });

  it('should show "No options found" when search has no results', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const button = screen.getByRole('button', { name: /select dropdown/i });
    await user.click(button);

    const searchInput = screen.getByPlaceholderText('Search options...');
    await user.type(searchInput, 'nonexistent');

    expect(screen.getByText('No options found')).toBeInTheDocument();
  });

  it('should select an option when clicked', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const button = screen.getByRole('button', { name: /select dropdown/i });
    await user.click(button);

    const option1Button = screen.getByRole('option', { name: 'Option 1' });
    await user.click(option1Button);

    // Dropdown should close and button should show selected value
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(button).toHaveTextContent('Option 1');
  });

  it('should submit form with selected value', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TestWrapper onSubmit={onSubmit} />);

    const button = screen.getByRole('button', { name: /select dropdown/i });
    await user.click(button);

    const option2Button = screen.getByRole('option', { name: 'Option 2' });
    await user.click(option2Button);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ testField: 'option2' }),
      expect.anything()
    );
  });

  it('should show "Clear Selection" button when value is selected', async () => {
    const user = userEvent.setup();
    render(<TestWrapper defaultValue="option1" />);

    const button = screen.getByRole('button', { name: /select dropdown/i });
    expect(button).toHaveTextContent('Option 1');

    await user.click(button);

    const clearButton = screen.getByRole('button', { name: /clear selection/i });
    expect(clearButton).toBeInTheDocument();
  });

  it('should clear selection and keep dropdown open when "Clear Selection" is clicked', async () => {
    const user = userEvent.setup();
    render(<TestWrapper defaultValue="option1" />);

    const button = screen.getByRole('button', { name: /select dropdown/i });
    await user.click(button);

    const clearButton = screen.getByRole('button', { name: /clear selection/i });
    await user.click(clearButton);

    // Dropdown should stay open
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Button text should show placeholder (after closing dropdown)
    await user.click(document.body);
    expect(button).toHaveTextContent('Select an option...');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<TestWrapper disabled />);
    const button = screen.getByRole('button', { name: /select dropdown/i });
    expect(button).toBeDisabled();
  });

  it('should show selected value from default', () => {
    render(<TestWrapper defaultValue="option2" />);
    const button = screen.getByRole('button', { name: /select dropdown/i });
    expect(button).toHaveTextContent('Option 2');
  });

  it('should show placeholder initially when no default', () => {
    render(<TestWrapper />);
    const button = screen.getByRole('button', { name: /select dropdown/i });
    expect(button).toHaveTextContent('Select an option...');
  });

  it('should close dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const button = screen.getByRole('button', { name: /select dropdown/i });
    await user.click(button);

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Click outside
    await user.click(document.body);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should highlight selected option in dropdown', async () => {
    const user = userEvent.setup();
    render(<TestWrapper defaultValue="option2" />);

    const button = screen.getByRole('button', { name: /select dropdown/i });
    await user.click(button);

    const selectedOption = screen.getByRole('option', { name: 'Option 2' });
    expect(selectedOption).toHaveClass('bg-blue-50');
  });
});
