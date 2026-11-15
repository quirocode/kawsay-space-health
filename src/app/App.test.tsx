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
    expect(screen.getByRole('link', { name: 'Mission: Mars transit' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Moon surface/ }));
    expect(screen.getByRole('link', { name: 'Mission: Moon surface' })).toBeInTheDocument();
    window.location.hash = '';
  });

  it('explains what the mission days mean', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /What do these days mean/ }));
    const dialog = screen.getByRole('dialog', { name: 'Mission days' });
    expect(dialog).toHaveTextContent('Today is day 142 since launch.');
    expect(dialog).toHaveTextContent('Landing is on day 180, in 38 days.');
    expect(dialog).toHaveTextContent(/sol/);
  });

  it('edits the mission name, crew and days, and shows them in the header', () => {
    window.location.hash = '#/environment';
    render(<App />);
    expect(screen.getByRole('link', { name: 'Mission Inti-1, crew member A. Quispe' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Mission name'), { target: { value: 'Artemis Base' } });
    fireEvent.change(screen.getByLabelText('Crew member'), { target: { value: 'R. Quiroga' } });
    fireEvent.change(screen.getByLabelText('Today is mission day'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Landing day'), { target: { value: '20' } });
    expect(screen.getByRole('button', { name: 'Save mission' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Landing day'), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save mission' }));
    expect(screen.getByRole('link', { name: 'Mission Artemis Base, crew member R. Quiroga' })).toBeInTheDocument();
    expect(screen.getByText('Day 30 of 90')).toBeInTheDocument();
    expect(screen.getByText(/60 days to landing/)).toBeInTheDocument();
    window.location.hash = '';
  });
});
