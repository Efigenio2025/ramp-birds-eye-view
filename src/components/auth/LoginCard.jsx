import { useState } from "react"
import { supabase } from "../../lib/supabase"

export default function LoginCard() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState("idle") // idle | sending | sent | error
  const [error, setError] = useState("")

  const sendLink = async () => {
    setError("")
    const clean = email.trim().toLowerCase()
    if (!clean || !clean.includes("@")) {
      setError("Enter a valid email.")
      return
    }

    setStatus("sending")
    const { error: err } = await supabase.auth.signInWithOtp({
      email: clean,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (err) {
      setStatus("error")
      setError(err.message)
      return
    }

    setStatus("sent")
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-ramp-border bg-ramp-panel p-5 shadow-sm">
      <div className="text-xl font-bold text-ramp-text">Sign in</div>
      <div className="mt-1 text-sm text-ramp-muted">
        Enter your email and we’ll send you a magic link.
      </div>

      <label className="mt-4 block text-xs font-semibold text-ramp-muted">
        Email
      </label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="mt-2 w-full rounded-xl border border-ramp-border bg-ramp-bg/40 px-3 py-2 text-ramp-text outline-none focus:ring-2 focus:ring-ramp-blue"
        autoComplete="email"
        inputMode="email"
      />

      {error ? (
        <div className="mt-3 rounded-xl border border-ramp-border bg-ramp-bg/40 p-3 text-sm text-ramp-red">
          {error}
        </div>
      ) : null}

      {status === "sent" ? (
        <div className="mt-3 rounded-xl border border-ramp-border bg-ramp-bg/40 p-3 text-sm text-ramp-green">
          Link sent. Check your email and open the link on this device.
        </div>
      ) : null}

      <button
        onClick={sendLink}
        disabled={status === "sending"}
        className="mt-4 w-full rounded-xl bg-ramp-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Send magic link"}
      </button>

      <div className="mt-3 text-xs text-ramp-muted">
        If you don’t see it, check spam/junk. The link will bring you back here
        and log you in automatically.
      </div>
    </div>
  )
}
