import { useMemo, useState } from "react"
import AuthGate from "./features/auth/AuthGate"
import MobileDashboard from "./features/dashboard/MobileDashboard"
import CabinListScreen from "./features/cabin/CabinListScreen"
import NightAircraftScreen from "./features/night/NightAircraftScreen"

function Placeholder({ title }) {
  return (
    <div className="min-h-screen bg-ramp-bg text-ramp-text">
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="text-lg font-extrabold">{title}</div>
        <div className="mt-2 text-sm text-ramp-muted">Next module.</div>
      </div>
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [station] = useState("OMA")
  const [outsideTempF, setOutsideTempF] = useState(6)

  const screen = useMemo(() => {
    if (activeTab === "dashboard") {
      return (
        <MobileDashboard
          station={station}
          activeTab={activeTab}
          onNav={setActiveTab}
          onOpenCabin={() => setActiveTab("cabin")}
          onOpenNight={() => setActiveTab("night")}
          onOpenDeice={() => setActiveTab("deice")}
          onOpenNotes={() => setActiveTab("notes")}
        />
      )
    }

    if (activeTab === "cabin") {
      return (
        <CabinListScreen
          station={station}
          activeTab={activeTab}
          onNav={setActiveTab}
          outsideTempF={outsideTempF}
          setOutsideTempF={setOutsideTempF}
        />
      )
    }

    if (activeTab === "night") {
      return <NightAircraftScreen station={station} activeTab={activeTab} onNav={setActiveTab} />
    }

    if (activeTab === "deice") return <Placeholder title="Deice Trucks" />
    if (activeTab === "notes") return <Placeholder title="Notes / Handoff" />

    return null
  }, [activeTab, outsideTempF, station])

  return <AuthGate>{screen}</AuthGate>
}