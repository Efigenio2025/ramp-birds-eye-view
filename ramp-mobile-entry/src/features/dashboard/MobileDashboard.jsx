import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"

import Panel from "../../components/ui/Panel"
import StatusPill from "../../components/ui/StatusPill"
import StatusValue from "../../components/ui/StatusValue"

// ----------------------------
// Config / Rules
// ----------------------------
const DUE_SOON_MINUTES = 10

function minutesAgo(iso) {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  const diff = Date.now() - t
  return Math.floor(diff / 60000)
}

function frequencyMinutes(outsideTempF) {
  // Your rule: Above 10°F = 60 min / Below 10°F = 30 min
  if (outsideTempF == null) return 60
  return outsideTempF < 10 ? 30 : 60
}

function toneFromStatus(status) {
  if (status === "OVERDUE") return "danger"
  if (status === "DUE SOON") return "warn"
  if (status === "OK") return "good"
  return "muted"
}

function ActivityLine({ who, what, when }) {
  return (
    <div className="rounded-2xl bg-white/4 p-4 ring-1 ring-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-ramp-text">
            <span className="font-semibold">{who}</span>{" "}
            <span className="text-ramp-muted">{what}</span>
          </div>
        </div>
        <div className="shrink-0 text-xs text-ramp-muted">{when}</div>
      </div>
    </div>
  )
}

function RowItem({ label, meta, pillLabel, pillTone = "muted", onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-2xl bg-white/4 p-4 text-left ring-1 ring-white/10",
        "hover:bg-white/6 active:scale-[0.99] transition",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ramp-text">{label}</div>
          <div className="mt-1 text-xs text-ramp-muted">{meta}</div>
        </div>
        <StatusPill label={pillLabel} tone={pillTone} />
      </div>
    </button>
  )
}

function BottomNav({ active, onNav }) {
  const items = [
    { key: "dashboard", label: "Dashboard" },
    { key: "cabin", label: "Cabin Temp" },
    { key: "deice", label: "Deice" },
    { key: "gse", label: "GSE" },
    { key: "notes", label: "Notes" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-ramp-bg/85 backdrop-blur ring-1 ring-white/10">
      <div className="mx-auto flex max-w-md items-center justify-between px-3 py-2">
        {items.map((it) => {
          const isActive = active === it.key
          return (
            <button
              key={it.key}
              onClick={() => onNav(it.key)}
              className={[
                "flex flex-1 flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-semibold transition",
                isActive ? "text-ramp-text bg-white/8 ring-1 ring-white/10" : "text-ramp-muted hover:bg-white/5",
              ].join(" ")}
            >
              {it.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function MobileDashboard({
  station = "OMA",
  activeTab = "dashboard",
  onNav = () => {},
  onOpenCabin = () => onNav("cabin"),
  onOpenDeice = () => onNav("deice"),
  onOpenNotes = () => onNav("notes"),
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [outsideTempF, setOutsideTempF] = useState(6) // manual for now
  const [tails, setTails] = useState([])
  const [checks, setChecks] = useState([])

  const freq = frequencyMinutes(outsideTempF)

  const load = async () => {
    setError("")
    setLoading(true)

    const { data: aircraftRows, error: aircraftErr } = await supabase
      .from("aircraft")
      .select("tail")
      .eq("active", true)
      .order("tail", { ascending: true })

    if (aircraftErr) {
      setError(`Aircraft load failed: ${aircraftErr.message}`)
      setLoading(false)
      return
    }

    const tailList = (aircraftRows ?? []).map((r) => r.tail)
    setTails(tailList)

    if (tailList.length === 0) {
      setChecks([])
      setLoading(false)
      return
    }

    const { data: checkRows, error: checkErr } = await supabase
      .from("cabin_temp_checks")
      .select("id, tail, temp_f, checked_by, checked_at, notes")
      .in("tail", tailList)
      .order("checked_at", { ascending: false })
      .limit(250)

    if (checkErr) {
      setError(`Cabin checks load failed: ${checkErr.message}`)
      setChecks([])
      setLoading(false)
      return
    }

    setChecks(checkRows ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30 * 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cabinCards = useMemo(() => {
    const latestByTail = new Map()
    const countByTail = new Map()

    for (const r of checks) {
      countByTail.set(r.tail, (countByTail.get(r.tail) ?? 0) + 1)
      if (!latestByTail.has(r.tail)) latestByTail.set(r.tail, r)
    }

    const cards = tails.map((tail) => {
      const latest = latestByTail.get(tail)
      const minsSince = latest ? minutesAgo(latest.checked_at) : null
      const minsRemaining = latest && minsSince != null ? freq - minsSince : null

      let status = "NO DATA"
      if (latest) {
        if (minsRemaining != null && minsRemaining <= 0) status = "OVERDUE"
        else if (minsRemaining != null && minsRemaining <= DUE_SOON_MINUTES) status = "DUE SOON"
        else status = "OK"
      }

      const tone = toneFromStatus(status)

      return {
        tail,
        latest,
        minsSince,
        minsRemaining,
        status,
        tone,
        count: countByTail.get(tail) ?? 0,
      }
    })

    // Sort most urgent first
    const rank = (tone) => (tone === "danger" ? 0 : tone === "warn" ? 1 : tone === "good" ? 2 : 3)
    cards.sort((a, b) => {
      const r = rank(a.tone) - rank(b.tone)
      if (r !== 0) return r
      return (a.minsRemaining ?? 9999) - (b.minsRemaining ?? 9999)
    })

    return cards
  }, [checks, tails, freq])

  const overdueCount = cabinCards.filter((c) => c.tone === "danger").length
  const dueSoonCount = cabinCards.filter((c) => c.tone === "warn").length

  const top = cabinCards[0]
  const topTemp = top?.latest?.temp_f ?? null
  const topTail = top?.tail ?? "—"
  const topNext = top?.minsRemaining != null ? Math.max(0, top.minsRemaining) : null

  const recentActions = useMemo(() => checks.slice(0, 4), [checks])

  const deiceOperational = "—"
  const handoffReady = "—"

  const overallTone =
    loading ? "warn" : overdueCount > 0 ? "danger" : dueSoonCount > 0 ? "warn" : "good"

  const overallLabel =
    loading ? "LOADING" : overdueCount > 0 ? "ATTENTION" : dueSoonCount > 0 ? "DUE SOON" : "OK"

  return (
    <div className="min-h-screen text-ramp-text">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-ramp-bg/80 backdrop-blur ring-1 ring-white/10">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-extrabold leading-tight">Ramp Birds Eye View</div>
              <div className="mt-1 text-sm text-ramp-muted">
                Display mode • live Supabase feed • {station}
              </div>
            </div>

            <button
              onClick={load}
              className="shrink-0 rounded-xl bg-white/6 px-3 py-2 text-xs font-semibold ring-1 ring-white/12 hover:bg-white/8 active:scale-[0.99] transition"
            >
              Refresh
            </button>
          </div>

          {/* Outside temp controls */}
          <div className="mt-3 rounded-2xl bg-white/4 p-3 ring-1 ring-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-ramp-muted">
                Outside Temp (manual for now)
                <div className="mt-1 text-sm font-semibold text-ramp-text">
                  {outsideTempF}°F • Checks every {freq} min
                </div>
              </div>

              <div className="w-40">
                <input
                  type="range"
                  min={-10}
                  max={40}
                  value={outsideTempF}
                  onChange={(e) => setOutsideTempF(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-3 rounded-2xl bg-ramp-red/10 p-3 ring-1 ring-ramp-red/20">
              <div className="text-sm font-semibold text-ramp-red">Error</div>
              <div className="mt-1 text-xs text-ramp-muted">{error}</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-md px-4 pb-28 pt-4">
        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-3">
          <StatusValue
            label="Overdue"
            value={loading ? "…" : String(overdueCount)}
            meta="Cabin temp module"
            tone={!loading && overdueCount > 0 ? "danger" : "good"}
            onClick={onOpenCabin}
          />
          <StatusValue
            label="Cabin Temp"
            value={topTemp == null ? "—" : `${topTemp}°F`}
            meta={`${topTail} • next due ${topNext == null ? "—" : `${topNext}m`}`}
            tone={!loading && overdueCount > 0 ? "warn" : "good"}
            onClick={onOpenCabin}
          />
          <StatusValue
            label="Deice Trucks"
            value={deiceOperational}
            meta="Operational (next module)"
            tone="muted"
            onClick={onOpenDeice}
          />
          <StatusValue
            label="Handoff Ready"
            value={handoffReady}
            meta="Checks & balances (next)"
            tone="muted"
            onClick={onOpenNotes}
          />
        </div>

        {/* Overdue & At-Risk */}
        <div className="mt-4">
          <Panel
            title="Overdue & At-Risk"
            subtitle="Tap to drill down"
            right={<StatusPill label={overallLabel} tone={overallTone} />}
          >
            <div className="space-y-3">
              <RowItem
                label="Cabin Temperature Checks"
                meta={
                  loading
                    ? "Loading…"
                    : `${overdueCount} overdue • ${dueSoonCount} due soon • ${tails.length} aircraft`
                }
                pillLabel={loading ? "…" : overdueCount > 0 ? "ATTENTION" : dueSoonCount > 0 ? "DUE SOON" : "OK"}
                pillTone={loading ? "warn" : overdueCount > 0 ? "danger" : dueSoonCount > 0 ? "warn" : "good"}
                onClick={onOpenCabin}
              />
              <RowItem
                label="Deice Trucks Operational"
                meta="Next module"
                pillLabel="SOON"
                pillTone="warn"
                onClick={onOpenDeice}
              />
              <RowItem
                label="Handoff / Quick Notes"
                meta="Next module"
                pillLabel="SOON"
                pillTone="warn"
                onClick={onOpenNotes}
              />
            </div>
          </Panel>
        </div>

        {/* Cabin Temperature summary */}
        <div className="mt-4">
          <Panel
            title="Cabin Temperature"
            subtitle={`Outside ${outsideTempF}°F • every ${freq} min`}
            right={
              <button
                onClick={onOpenCabin}
                className="rounded-xl bg-white/6 px-3 py-2 text-xs font-semibold ring-1 ring-white/12 hover:bg-white/8 active:scale-[0.99] transition"
              >
                View
              </button>
            }
          >
            <div className="rounded-2xl bg-white/4 p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-3xl font-extrabold tracking-tight">
                    {topTemp == null ? "—" : `${topTemp}°F`}
                  </div>
                  <div className="mt-1 text-xs text-ramp-muted">
                    {topTail} • next due {topNext == null ? "—" : `${topNext}m`}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-ramp-muted">Status</div>
                  <div className="mt-1 flex justify-end gap-2">
                    <StatusPill label={`${overdueCount} overdue`} tone={overdueCount > 0 ? "danger" : "good"} />
                    <StatusPill label={`${dueSoonCount} due soon`} tone={dueSoonCount > 0 ? "warn" : "muted"} />
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs text-ramp-muted">
                Rule: &lt; 10°F → 30 min • ≥ 10°F → 60 min
              </div>
            </div>
          </Panel>
        </div>

        {/* Recent Actions */}
        <div className="mt-4">
          <Panel
            title="Recent Actions"
            subtitle="Cabin temp feed (latest entries)"
            right={<StatusPill label={loading ? "Loading" : "Live"} tone={loading ? "warn" : "good"} />}
          >
            <div className="space-y-3">
              {recentActions.length === 0 ? (
                <div className="rounded-2xl bg-white/4 p-4 text-sm text-ramp-muted ring-1 ring-white/10">
                  No actions found yet.
                </div>
              ) : (
                recentActions.map((r) => (
                  <ActivityLine
                    key={r.id}
                    who={r.checked_by}
                    what={`Recorded cabin temp: ${r.temp_f}°F (${r.tail})`}
                    when={new Date(r.checked_at).toLocaleTimeString()}
                  />
                ))
              )}
            </div>

            <div className="mt-4 text-xs text-ramp-muted">
              Next: realtime updates (instant) + true weather feed.
            </div>
          </Panel>
        </div>
      </div>

      <BottomNav active={activeTab} onNav={onNav} />
    </div>
  )
}