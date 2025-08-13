import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { test, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import App from '../src/App.jsx';

test('newly added driver persists while editing under active filters', async () => {
  render(<App />);

  // Switch to Recruitment tab where the table and filters live
  fireEvent.click(screen.getByText('Recruitment'));

  // Set filters for recruiter, source, and date range
  const dateInputs = document.querySelectorAll('input[type="date"]');
  fireEvent.change(dateInputs[0], { target: { value: '2024-01-01' } });
  fireEvent.change(dateInputs[1], { target: { value: '2024-01-31' } });

  const filterSelects = screen.getAllByRole('combobox');
  fireEvent.change(filterSelects[0], { target: { value: 'Emily' } });
  fireEvent.change(filterSelects[1], { target: { value: 'Referral' } });

  // Add a new driver row
  fireEvent.click(screen.getByText('+ Driver'));

  const nameInput = await screen.findByPlaceholderText('Driver');
  expect(nameInput).toBeInTheDocument();

  // Fill in fields with values that do not match active filters
  fireEvent.change(nameInput, { target: { value: 'Temp' } });
  const row = nameInput.closest('tr');
  const rowSelects = within(row).getAllByRole('combobox');
  fireEvent.change(rowSelects[0], { target: { value: 'Victoria' } });
  expect(screen.getByPlaceholderText('Driver')).toBeInTheDocument();

  fireEvent.change(rowSelects[1], { target: { value: 'Agent' } });
  expect(screen.getByPlaceholderText('Driver')).toBeInTheDocument();

  const startDateInput = row.querySelector('input[type="date"]');
  fireEvent.change(startDateInput, { target: { value: '2024-03-10' } });

  // Once all required fields are filled, the row should be filtered out
  await waitFor(() => {
    expect(screen.queryByPlaceholderText('Driver')).toBeNull();
  });
});

