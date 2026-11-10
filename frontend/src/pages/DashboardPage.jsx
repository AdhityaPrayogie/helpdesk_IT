// frontend/src/pages/DashboardPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLogbook } from "../api";
import StatsCards from "../components/StatsCards";
import RecentActivity from "../components/RecentActivity";

export default function DashboardPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  // bulan/tahun dipakai bersama kartu statistik & filter bulanan grafik
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const navigate = useNavigate();

  // satu unduhan dipakai kartu statistik dan aktivitas terbaru
  useEffect(() => {
    getLogbook()
      .then((res) => setRows(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <header className="topbar">
        <h1>Dashboard</h1>
      </header>
      <main className="page-content">
        <StatsCards rows={rows} loading={loading} month={month} year={year} />
        <RecentActivity
          rows={rows}
          loading={loading}
          selectedMonth={month}
          selectedYear={year}
          setSelectedMonth={setMonth}
          setSelectedYear={setYear}
          onSeeAll={() => navigate("/data")}
        />
      </main>
    </>
  );
}
