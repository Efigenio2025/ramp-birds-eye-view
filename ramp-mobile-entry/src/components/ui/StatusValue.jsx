const valueTone = {
  good: "text-ramp-text",
  muted: "text-ramp-text",
  warn: "text-[rgb(var(--ramp-amber))]",
  danger: "text-[rgb(var(--ramp-red))]",
}

export default function StatusValue({
  label,
  value,
  meta,
  tone = "muted",
  onClick,
  className = "",
}) {
  const vcls = valueTone[tone] ?? valueTone.muted

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-2xl bg-gradient-to-b from-white/8 to-white/3 p-4 text-left",
        "ring-1 ring-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.35)]",
        onClick ? "active:scale-[0.99] transition" : "",
        className,
      ].join(" ")}
    >
      <div className="text-xs font-semibold text-ramp-muted">{label}</div>
      <div className={["mt-2 text-3xl font-extrabold tracking-tight", vcls].join(" ")}>
        {value}
      </div>
      {meta ? <div className="mt-1 text-xs text-ramp-muted">{meta}</div> : null}
    </button>
  )
}