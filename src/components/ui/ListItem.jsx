export default function ListItem({
  label,
  meta,
  badge,
  badgeTone = "warn", // good | warn | danger
  onClick,
}) {
  const toneStyles =
    badgeTone === "good"
      ? "bg-ramp-green/15 text-ramp-green border-ramp-green/30"
      : badgeTone === "danger"
        ? "bg-ramp-red/15 text-ramp-red border-ramp-red/30"
        : "bg-ramp-amber/15 text-ramp-amber border-ramp-amber/30"

  const clickable = typeof onClick === "function"

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={!clickable}
        className={[
          "w-full rounded-xl border border-ramp-border bg-ramp-bg/40 p-3 text-left",
          clickable ? "hover:opacity-90 cursor-pointer" : "cursor-default opacity-95",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-ramp-text">{label}</div>
            {meta ? (
              <div className="mt-1 text-xs text-ramp-muted">{meta}</div>
            ) : null}
          </div>

          {badge ? (
            <span
              className={[
                "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold",
                toneStyles,
              ].join(" ")}
            >
              {badge}
            </span>
          ) : null}
        </div>
      </button>
    </li>
  )
}
