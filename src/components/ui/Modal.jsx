import { useEffect } from "react"

export default function Modal({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-5xl rounded-2xl border border-ramp-border bg-ramp-panel p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-bold">{title}</div>
            {subtitle ? (
              <div className="mt-1 text-xs text-ramp-muted">{subtitle}</div>
            ) : null}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg border border-ramp-border bg-ramp-bg/40 px-3 py-2 text-sm hover:opacity-90"
          >
            Close
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
