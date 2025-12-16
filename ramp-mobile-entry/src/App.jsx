import { useMemo, useState } from "react"
import MobileDashboard from "./features/dashboard/MobileDashboard"
import CabinListScreen from "./features/cabin/CabinListScreen"

// Simple placeholder screens for now
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

  // Keep this shared between Dashboard + Cabin screens
  const [outsideTempF, setOutsideTempF] = useState(6)

  const screen = useMemo(() => {
    if (activeTab === "dashboard") {
      return (
        <MobileDashboard
          station={station}
          activeTab={activeTab}
          onNav={setActiveTab}
          onOpenCabin={() => setActiveTab("cabin")}
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

    if (activeTab === "deice") return <Placeholder title="Deice Trucks" />
    if (activeTab === "gse") return <Placeholder title="GSE" />
    if (activeTab === "notes") return <Placeholder title="Notes / Handoff" />

    return (
      <MobileDashboard
        station={station}
        activeTab="dashboard"
        onNav={setActiveTab}
        onOpenCabin={() => setActiveTab("cabin")}
      />
    )
  }, [activeTab, outsideTempF, station])

  return screen
}