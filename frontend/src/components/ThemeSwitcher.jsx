import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import "./ThemeSwitcher.css";

// Mode terang/gelap. Nilai awal diset index.html (sebelum React) supaya tidak berkedip.
export default function ThemeSwitcher() {
  const [mode, setMode] = useState(
    () => document.documentElement.dataset.theme || "light",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    try {
      localStorage.setItem("app-theme", mode);
    } catch {
      /* mode privat: abaikan */
    }
  }, [mode]);

  const dark = mode === "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setMode(dark ? "light" : "dark")}
      aria-label={dark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      title={dark ? "Mode terang" : "Mode gelap"}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
