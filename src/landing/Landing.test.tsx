import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Landing } from './Landing';
import copy from '../../content/landing.json';

describe('Landing page', () => {
  it('links the demo to the app and the video button to the video section', () => {
    render(<Landing />);
    const demo = screen.getAllByRole('link', { name: new RegExp(copy.hero.primary) });
    expect(demo[0]).toHaveAttribute('href', '/app/');
    expect(screen.getByRole('link', { name: copy.hero.secondary })).toHaveAttribute('href', '#video');
    expect(screen.getByRole('link', { name: copy.cta.download })).toHaveAttribute('href', copy.links.download);
  });

  it('shows the challenges, the advantages and the full technology list', () => {
    render(<Landing />);
    for (const p of copy.challenge.problems) expect(screen.getAllByText(p.title).length).toBeGreaterThan(0);
    for (const s of copy.challenge.solutions) expect(screen.getAllByText(s.title).length).toBeGreaterThan(0);
    for (const s of copy.advantages.stats) expect(screen.getAllByText(s.label).length).toBeGreaterThan(0);
    for (const t of copy.technology.items) expect(screen.getAllByText(t.title).length).toBeGreaterThan(0);
  });
});
