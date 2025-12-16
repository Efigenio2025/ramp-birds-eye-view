import Badge from "../ui/Badge"

export default function CabinTempCard({
  tail,
  temp,
  checkedBy,
  minsSince,
  minsRemaining,
  status,
  tone,
  historyCount,
  onClick,
}) {
  const statusColor =
    tone === "danger"
      ? "text-ramp-red"
      : tone === "warn"
      ? "text-ramp-amber"
      : "text-ramp-green"

  const badgeTone = tone === "good" ? "good" : tone === "warn" ? "warn" : "danger"

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-ramp-border bg-ramp-bg/40 p-3 hover:opacity-95"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.()
      }}
      title="Click to view history"
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold">{tail}</div>
        <span className={`text-xs font-semibold ${statusColor}`}>{status}</span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="text-3xl font-bold">{temp == null ? "—" : `${temp}°F`}</div>

        <div className="text-right text-xs text-ramp-muted">
          {minsSince == null ? (
            <div>No checks yet</div>
          ) : (
            <>
              <div>Last: {minsSince} min ago</div>
              <div>Next due in: {Math.max(0, minsRemaining)} min</div>
            </>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-ramp-muted">
        <div>Checked by: {checkedBy}</div>
        <div>
          <Badge text={`${historyCount} records`} tone={badgeTone} />
        </div>
      </div>
    </div>
  )
}
