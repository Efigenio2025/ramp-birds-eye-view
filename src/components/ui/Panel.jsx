export default function Panel({ title, children, clickable, onClick }) {
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
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ramp-text">{title}</h2>
        {clickable ? <span className="text-xs text-ramp-muted">View</span> : null}
      </div>
      {children}
    </div>
  )
}
