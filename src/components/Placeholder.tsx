import ui from '../../content/ui.json';

/** Temporary screen body until the owner (P2) builds it. */
export function Placeholder({ title, owner }: { title: string; owner: string }) {
  return (
    <section className="mx-auto max-w-3xl p-8">
      <h1 className="text-[34px] font-bold">{title}</h1>
      <p className="mt-2 text-ink-2">
        {ui.placeholder} ({owner})
      </p>
    </section>
  );
}
