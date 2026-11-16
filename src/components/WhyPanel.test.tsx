import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { WhyPanel } from './WhyPanel';
import type { Why } from '../app/why/explain';

const why: Why = {
  status: 'red',
  meaning: 'Your blood pressure is above the safe range.',
  yourCase: ['Your reading: 200 mmHg.', 'Your usual: 113–116 mmHg over the last 7 days.'],
  doNow: 'Sit still for 5 minutes, then measure again.',
  recheck: 'Measure again in 5 minutes.',
  escalate: 'If it does not get better, call the crew medical officer.',
  sources: [{ label: 'NASA — Risk of Cardiovascular Adaptations', url: 'https://www.nasa.gov/x', official: true }],
};

describe('WhyPanel', () => {
  afterEach(cleanup);

  it('explains before it cites', () => {
    render(<WhyPanel why={why} defaultOpen />);
    expect(screen.getByText('What it means')).toBeInTheDocument();
    expect(screen.getByText(why.meaning)).toBeInTheDocument();
    expect(screen.getByText('Your reading: 200 mmHg.')).toBeInTheDocument();
    expect(screen.getByText(why.doNow!)).toBeInTheDocument();
    expect(screen.getByText(why.escalate!)).toBeInTheDocument();
    // Sources are still there, folded under Evidence.
    expect(screen.getByText('Evidence (1)')).toBeInTheDocument();
  });

  it('can leave the first step to the screen that already shows it', () => {
    render(<WhyPanel why={why} defaultOpen hideDoNow />);
    expect(screen.queryByText(why.doNow!)).not.toBeInTheDocument();
  });

  it('offers no local AI where there is no WebGPU', () => {
    render(<WhyPanel why={why} defaultOpen />);
    expect(screen.queryByText('Say it simply (local AI)')).not.toBeInTheDocument();
  });
});
