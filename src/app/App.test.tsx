import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';

afterEach(cleanup);

describe('App shell', () => {
  it('loads the demo mission and shows landing readiness with the plan', () => {
    render(<App />);
    expect(screen.getByText('Day 142 of 180')).toBeInTheDocument();
    expect(screen.getByText(/38 days to landing/)).toBeInTheDocument();
    expect(screen.getByText(/Earth delay 14 min/)).toBeInTheDocument();
    const score = Number(screen.getByTestId('readiness-score').textContent);
    expect(score).toBeGreaterThan(0);
    expect(screen.getByRole('list', { name: 'Landing day tasks' }).children).toHaveLength(4);
    expect(screen.getByText(/Not a medical device/)).toBeInTheDocument();
  });

  it('shows the chosen environment next to the title as soon as it is picked', () => {
    window.location.hash = '#/environment';
    render(<App />);
    expect(screen.getByRole('link', { name: 'Environment: Mars transit' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Moon surface/ }));
    expect(screen.getByRole('link', { name: 'Environment: Moon surface' })).toBeInTheDocument();
    window.location.hash = '';
  });

  it('explains what the mission days mean', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /What do these days mean/ }));
    const dialog = screen.getByRole('dialog', { name: 'Mission days' });
    expect(dialog).toHaveTextContent('Today is day 142 since launch.');
    expect(dialog).toHaveTextContent('You land on Mars on day 180, in 38 days.');
    expect(dialog).toHaveTextContent(/sol/);
  });
});
