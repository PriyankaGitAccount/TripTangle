export default function TripLoading() {
  return (
    <div className="mx-auto w-full max-w-lg animate-pulse px-4 py-6">
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="h-8 w-48 rounded-lg bg-muted" />
          <div className="h-4 w-64 rounded bg-muted" />
        </div>

        {/* Members skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 w-28 rounded-full bg-muted" />
            ))}
          </div>
        </div>

        {/* Calendar skeleton */}
        <div className="space-y-3">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} className="h-11 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
