export default function ReadinessRow({ label, value, tone = "warn" }) {
  const dot =
    tone === "good"
      ? "bg-ramp-green"
      : tone === "danger"
        ? "bg-ramp-red"
        : "bg-ramp-amber"

  const valueClass =
    tone === "good"
      ? "text-ramp-green"
      : tone === "danger"
        ? "text-ramp-red"
        : "text-ramp-amber"

  return (
    <div className="flex items-center justify-between rounded-xl border border-ramp-border bg-ramp-bg/40 p-3">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        <div className="text-sm font-semibold text-ramp-text">{label}</div>
      </div>
      <div className={`text-sm font-bold ${valueClass}`}>{value}</div>
    </div>
  )
}
