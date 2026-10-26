import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-16 md:grid-cols-2 md:py-24">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted">Campus ticketing</p>
        <h1 className="mt-4 font-display text-5xl leading-tight text-fg md:text-6xl">
          The short way into the room.
        </h1>
        <p className="mt-5 max-w-md text-base leading-normal text-muted">
          Students book a seat. Event planners publish the night and scan the door.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center rounded-full bg-accent px-6 text-accent-fg"
          >
            Create a pass
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center rounded-full border border-line px-6 text-fg"
          >
            Sign in
          </Link>
        </div>
      </div>

      <article className="rounded-card border border-line bg-surface p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted">Sample pass</p>
          <p className="text-sm text-fg">Admit one</p>
        </div>
        <h2 className="mt-6 font-display text-3xl leading-tight text-fg">Night lecture series</h2>
        <p className="mt-2 text-base text-muted">North Hall · Friday 20:00</p>
        <div className="my-6 border-t border-dashed border-line" />
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted">Code</p>
            <p className="mt-1 text-lg tracking-widest text-fg">UT–4418</p>
          </div>
          <p className="text-sm text-muted">Not scanned</p>
        </div>
      </article>
    </section>
  );
}
