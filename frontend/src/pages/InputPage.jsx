// frontend/src/pages/InputPage.jsx
import { useNavigate } from "react-router-dom";
import LogbookForm from "../components/LogbookForm";

export default function InputPage() {
  const navigate = useNavigate();
  return (
    <>
      <header className="topbar">
        <h1>Input Helpdesk Harian</h1>
      </header>
      <main className="page-content">
        <LogbookForm onSaved={() => navigate("/data")} />
      </main>
    </>
  );
}
