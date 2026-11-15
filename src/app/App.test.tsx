import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';

afterEach(cleanup);

describe('App shell', () => {
  it('loads the demo mission and shows landing readiness with the plan', () => {
    render(<App />);
    expect(screen.getByText(/Sol 142 of 180/)).toBeInTheDocument();
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
});
