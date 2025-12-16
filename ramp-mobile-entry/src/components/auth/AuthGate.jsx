import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import LoginCard from "./LoginCard"

export default function AuthGate({ children }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null)
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ramp-bg text-ramp-text">
        <div className="mx-auto max-w-md px-4 py-10 text-sm text-ramp-muted">
          Loading…
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-ramp-bg text-ramp-text">
        <div className="mx-auto max-w-md px-4 py-10">
          <LoginCard />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ramp-bg text-ramp-text">
      <div className="mx-auto max-w-md px-4 py-4">
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-ramp-border bg-ramp-panel p-3">
          <div className="text-xs text-ramp-muted">
            Signed in as{" "}
            <span className="font-semibold text-ramp-text">
              {session.user.email}
            </span>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg border border-ramp-border bg-ramp-bg/40 px-3 py-2 text-xs hover:opacity-90"
          >
            Sign out
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}
