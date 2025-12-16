export default function Panel({
  title,
  subtitle,
  right,
  children,
  className = "",
}) {
  return (
    <section
      className={[
        "rounded-2xl bg-gradient-to-b from-white/8 to-white/3",
        "ring-1 ring-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.35)]",
        className,
      ].join(" ")}
    >
      {(title || subtitle || right) ? (
        <header className="flex items-start justify-between gap-3 p-5">
          <div className="min-w-0">
            {title ? <div className="text-sm font-semibold text-ramp-text">{title}</div> : null}
            {subtitle ? <div className="mt-1 text-xs text-ramp-muted">{subtitle}</div> : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </header>
      ) : null}

      <div className={title || subtitle || right ? "px-5 pb-5" : "p-5"}>
        {children}
      </div>
    </section>
  )
}