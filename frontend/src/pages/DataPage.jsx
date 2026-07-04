// frontend/src/pages/DataPage.jsx
import LogbookTable from "../components/LogbookTable";

export default function DataPage() {
  return (
    <>
      <header className="topbar">
        <h1>Data Logbook</h1>
      </header>
      <main className="page-content">
        <LogbookTable />
      </main>
    </>
  );
}
