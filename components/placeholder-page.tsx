type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="mx-auto max-w-5xl rounded-2xl border border-border bg-card p-8 shadow-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">Phase 1</p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">{title}</h1>
      <p className="mt-4 max-w-2xl text-zinc-300">{description}</p>
    </section>
  );
}
