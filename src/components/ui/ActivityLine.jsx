export default function ActivityLine({ who, what, when }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-ramp-border bg-ramp-bg/40 p-3">
      <div className="min-w-0">
        <div className="text-sm text-ramp-text">
          <span className="font-semibold">{who}</span>{" "}
          <span className="text-ramp-muted">{what}</span>
        </div>
      </div>
      <div className="shrink-0 text-xs text-ramp-muted">{when}</div>
    </div>
  )
}
