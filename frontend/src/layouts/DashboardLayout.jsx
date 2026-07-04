// frontend/src/layouts/DashboardLayout.jsx
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import StatsCards from "../components/StatsCards";
import RecentActivity from "../components/RecentActivity";
import LogbookForm from "../components/LogbookForm";
import LogbookTable from "../components/LogbookTable";

function DashboardLayout() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSaved = () => {
    setRefreshTrigger((prev) => prev + 1);
    setActiveTab("data");
  };

  const pageTitle = {
    dashboard: "Dashboard",
    input: "Input Helpdesk Harian",
    data: "Data Logbook",
  };

  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="main-area">
        <header className="topbar">
          <h1>{pageTitle[activeTab]}</h1>
        </header>

        <main className="page-content">
          {activeTab === "dashboard" && (
            <>
              <StatsCards refreshTrigger={refreshTrigger} />
              <RecentActivity
                refreshTrigger={refreshTrigger}
                onSeeAll={() => setActiveTab("data")}
              />
            </>
          )}

          {activeTab === "input" && <LogbookForm onSaved={handleSaved} />}

          {activeTab === "data" && (
            <LogbookTable refreshTrigger={refreshTrigger} />
          )}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
