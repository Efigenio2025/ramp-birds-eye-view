export default function StatCard({
  title,
  value,
  note,
  tone,
  clickable,
  onClick,
}) {
  const valueCls =
    tone === "danger"
      ? "text-ramp-red"
      : tone === "warn"
      ? "text-ramp-amber"
      : tone === "good"
      ? "text-ramp-green"
      : "text-ramp-text"

  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={[
        "rounded-2xl border border-ramp-border bg-ramp-panel p-4",
        clickable ? "cursor-pointer hover:opacity-95" : "",
      ].join(" ")}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (!clickable) return
        if (e.key === "Enter" || e.key === " ") onClick?.()
      }}
    >
      <div className="text-xs text-ramp-muted">{title}</div>
      <div className={`mt-1 text-2xl font-bold ${valueCls}`}>{value}</div>
      <div className="mt-1 text-xs text-ramp-muted">{note}</div>
    </div>
  )
}
