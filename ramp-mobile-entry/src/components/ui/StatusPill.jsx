const tones = {
  good: {
    bg: "bg-[rgb(var(--ramp-green)/0.15)]",
    text: "text-[rgb(var(--ramp-green))]",
    ring: "ring-[rgb(var(--ramp-green)/0.25)]",
  },
  warn: {
    bg: "bg-[rgb(var(--ramp-amber)/0.15)]",
    text: "text-[rgb(var(--ramp-amber))]",
    ring: "ring-[rgb(var(--ramp-amber)/0.25)]",
  },
  danger: {
    bg: "bg-[rgb(var(--ramp-red)/0.15)]",
    text: "text-[rgb(var(--ramp-red))]",
    ring: "ring-[rgb(var(--ramp-red)/0.25)]",
  },
  muted: {
    bg: "bg-white/5",
    text: "text-ramp-muted",
    ring: "ring-white/10",
  },
}

export default function StatusPill({ label, tone = "muted", className = "" }) {
  const t = tones[tone] ?? tones.muted

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold",
        "ring-1",
        t.bg,
        t.text,
        t.ring,
        className,
      ].join(" ")}
    >
      {label}
    </span>
  )
}