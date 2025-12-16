export default function Badge({ text, tone }) {
  const cls =
    tone === "danger"
      ? "bg-ramp-red/15 text-ramp-red border-ramp-red/30"
      : tone === "warn"
      ? "bg-ramp-amber/15 text-ramp-amber border-ramp-amber/30"
      : "bg-ramp-green/15 text-ramp-green border-ramp-green/30"

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${cls}`}>
      {text}
    </span>
  )
}
