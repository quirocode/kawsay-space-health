import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Landing } from './Landing';
import copy from '../../content/landing.json';
import spanish from '../../content/landing.es.json';

describe('Landing page', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('links the demo to the app and the video button to the video section', () => {
    render(<Landing />);
    const demo = screen.getAllByRole('link', { name: new RegExp(copy.hero.primary) });
    expect(demo).toHaveLength(3);
    demo.forEach((link) => expect(link).toHaveAttribute('href', '/app/?lang=en'));
    expect(screen.getByRole('link', { name: copy.hero.secondary })).toHaveAttribute('href', '#video');
    expect(screen.getByRole('link', { name: copy.cta.download })).toHaveAttribute('href', copy.links.download);
  });

  it('loads the YouTube demo only after the visitor presses play', async () => {
    const user = userEvent.setup();
    const { container } = render(<Landing />);
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('img', { name: copy.video.poster })).toHaveAttribute('src', '/video/upright-demo-poster.webp');
    expect(screen.getByRole('link', { name: copy.video.youtube })).toHaveAttribute('href', copy.links.youtube);

    await user.click(screen.getByRole('button', { name: copy.video.play }));
    const player = screen.getByTitle(copy.video.iframeTitle);
    expect(player).toHaveAttribute('src', expect.stringMatching(/^https:\/\/www\.youtube-nocookie\.com\/embed\/YVjr5qVNuqQ\?autoplay=1/));
  });

  it('shows the challenges, the advantages and the full technology list', () => {
    render(<Landing />);
    for (const p of copy.challenge.problems) expect(screen.getAllByText(p.title).length).toBeGreaterThan(0);
    for (const s of copy.challenge.solutions) expect(screen.getAllByText(s.title).length).toBeGreaterThan(0);
    for (const s of copy.advantages.stats) expect(screen.getAllByText(s.label).length).toBeGreaterThan(0);
    for (const t of copy.technology.items) expect(screen.getAllByText(t.title).length).toBeGreaterThan(0);
  });

  it('switches the landing copy and demo links to Spanish and restores the saved language', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Landing />);
    expect(document.documentElement.lang).toBe('en');

    const header = screen.getByRole('navigation', { name: copy.nav.label });
    const demo = within(header).getByRole('link', { name: copy.hero.primary });
    expect(demo).toHaveTextContent(copy.hero.primary);
    const demoClasses = demo.className;

    await user.click(screen.getByRole('button', { name: copy.nav.switchLanguage }));
    expect(document.documentElement.lang).toBe('es');
    expect(document.title).toBe(spanish.pageTitle);
    expect(screen.getByText(spanish.hero.subtitle)).toBeInTheDocument();
    expect(screen.getByText(spanish.footer.disclaimer)).toBeInTheDocument();
    expect(demo).toHaveTextContent(copy.hero.primary);
    expect(demo).toHaveAttribute('lang', 'en');
    expect(demo).toHaveAttribute('href', '/app/?lang=es');
    expect(demo.className).toBe(demoClasses);
    expect(screen.getAllByRole('link', { name: copy.hero.primary })).toHaveLength(3);
    expect(screen.getByRole('link', { name: spanish.footer.app[1].label })).toHaveAttribute('href', '/app/?lang=es#/check');

    unmount();
    render(<Landing />);
    expect(screen.getByText(spanish.hero.subtitle)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: spanish.nav.switchLanguage }));
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByText(copy.hero.subtitle)).toBeInTheDocument();
  });

  it('updates the tour screenshot and route using the keyboard and the selected language', async () => {
    const user = userEvent.setup();
    render(<Landing />);
    const tabs = screen.getByRole('tablist', { name: copy.tour.title });
    const future = within(tabs).getByRole('tab', { name: copy.tour.steps.future.tab });
    const check = within(tabs).getByRole('tab', { name: copy.tour.steps.check.tab });
    expect(future).toHaveAttribute('aria-selected', 'true');

    future.focus();
    await user.keyboard('{ArrowRight}');
    expect(check).toHaveFocus();
    expect(check).toHaveAttribute('aria-selected', 'true');
    let panel = within(screen.getByRole('tabpanel', { name: copy.tour.steps.check.tab }));
    expect(panel.getByRole('img', { name: copy.tour.steps.check.imageAlt })).toHaveAttribute('src', '/demo-tour/check-en.webp');
    expect(panel.getByRole('link', { name: copy.tour.openScreen })).toHaveAttribute('href', '/app/?lang=en#/check');

    await user.click(screen.getByRole('button', { name: copy.nav.switchLanguage }));
    panel = within(screen.getByRole('tabpanel', { name: spanish.tour.steps.check.tab }));
    expect(panel.getByRole('img', { name: spanish.tour.steps.check.imageAlt })).toHaveAttribute('src', '/demo-tour/check-es.webp');
    expect(panel.getByRole('link', { name: spanish.tour.openScreen })).toHaveAttribute('href', '/app/?lang=es#/check');

    await user.click(screen.getByRole('tab', { name: spanish.tour.steps.suit.tab }));
    panel = within(screen.getByRole('tabpanel', { name: spanish.tour.steps.suit.tab }));
    expect(panel.getByRole('link', { name: spanish.tour.openScreen })).toHaveAttribute('href', '/app/?lang=es#/suit');
  });

  it('switches the theme with the keyboard and restores it after reopening the landing page', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Landing />);
    const themeSwitch = screen.getByRole('switch', { name: copy.nav.nightMode });
    expect(themeSwitch).toHaveAttribute('aria-checked', 'true');

    themeSwitch.focus();
    await user.keyboard(' ');
    expect(themeSwitch).toHaveAttribute('aria-checked', 'false');
    expect(document.documentElement).toHaveAttribute('data-landing-theme', 'day');

    unmount();
    render(<Landing />);
    expect(screen.getByRole('switch', { name: copy.nav.nightMode })).toHaveAttribute('aria-checked', 'false');
    await user.click(screen.getByRole('switch', { name: copy.nav.nightMode }));
    expect(document.documentElement).toHaveAttribute('data-landing-theme', 'night');
  });
});
