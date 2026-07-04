// frontend/src/pages/DashboardPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StatsCards from "../components/StatsCards";
import RecentActivity from "../components/RecentActivity";

export default function DashboardPage() {
  const [refreshTrigger] = useState(0);
  const navigate = useNavigate();

  return (
    <>
      <header className="topbar">
        <h1>Dashboard</h1>
      </header>
      <main className="page-content">
        <StatsCards refreshTrigger={refreshTrigger} />
        <RecentActivity
          refreshTrigger={refreshTrigger}
          onSeeAll={() => navigate("/data")}
        />
      </main>
    </>
  );
}
