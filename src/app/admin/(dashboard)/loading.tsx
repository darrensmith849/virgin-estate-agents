/*
 * Shown the moment an admin page is opened, while it loads. The office is a
 * long way from the server, so a click should visibly respond straight away
 * rather than appear to do nothing for a moment.
 */
export default function AdminLoading() {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading">
      <div className="mb-8">
        <div className="h-8 w-56 rounded-md bg-line/70" />
        <div className="mt-3 h-4 w-80 max-w-full rounded bg-line/50" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-line bg-card" />
        ))}
      </div>
      <div className="mt-8 space-y-3 rounded-xl border border-line bg-card p-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-14 rounded-md bg-line/60" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/2 rounded bg-line/70" />
              <div className="h-3 w-1/3 rounded bg-line/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
