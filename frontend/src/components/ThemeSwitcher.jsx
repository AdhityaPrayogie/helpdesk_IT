
import { useCallback, useEffect, useState } from "react";
import "./ThemeSwitcher.css";

const THEME_LINK_ID = "app-theme-stylesheet";
const STORAGE_KEY = "app-theme";
const PANEL_STORAGE_KEY = "app-theme-panel-open";

const THEMES = {
  neo: {
    href: "/themes/theme-neo.css",
    label: "Neo-Brutalism",
  },
  glass: {
    href: "/themes/theme-glass.css",
    label: "Glassmorphism",
  },
};

function applyTheme(theme) {
  let link = document.getElementById(THEME_LINK_ID);
  if (!link) {
    link = document.createElement("link");
    link.id = THEME_LINK_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.getAttribute("href") !== THEMES[theme].href) {
    link.setAttribute("href", THEMES[theme].href);
  }
  document.documentElement.setAttribute("data-app-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "neo",
  );
  const [open, setOpen] = useState(
    () => localStorage.getItem(PANEL_STORAGE_KEY) !== "closed",
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(PANEL_STORAGE_KEY, open ? "open" : "closed");
  }, [open]);

  const toggleTheme = useCallback((e) => {
    e.stopPropagation();
    setTheme((t) => (t === "neo" ? "glass" : "neo"));
  }, []);

  const togglePanel = useCallback(() => {
    setOpen((o) => !o);
  }, []);

  const nextLabel = theme === "neo" ? "Glassmorphism" : "Neo-Brutalism";

  return (
    <div
      className={`tswitch ${open ? "tswitch-open" : "tswitch-closed"}`}
      data-theme-active={theme}
    >
      <div className="tswitch-panel" aria-hidden={!open}>
        <button
          type="button"
          className="tswitch-btn"
          onClick={toggleTheme}
          disabled={!open}
          title={`Ganti ke tampilan ${nextLabel}`}
        >
          <span className="tswitch-icon">
            {theme === "neo" ? (
              // ikon neo-brutalism: kotak dengan sudut tegas + hard shadow
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <rect
                  x="4.5"
                  y="4.5"
                  width="13"
                  height="13"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="2.2"
                />
                <rect
                  x="7.5"
                  y="7.5"
                  width="13"
                  height="13"
                  rx="1"
                  fill="currentColor"
                  opacity="0.9"
                />
              </svg>
            ) : (
              // ikon glassmorphism: lingkaran transparan berlapis
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="10.5"
                  cy="10.5"
                  r="7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  opacity="0.55"
                />
                <circle
                  cx="14"
                  cy="14"
                  r="7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            )}
          </span>
          <span className="tswitch-text">
            <strong>{THEMES[theme].label}</strong>
            <small>Klik untuk ganti ke {nextLabel}</small>
          </span>
        </button>
      </div>

      <button
        type="button"
        className="tswitch-handle"
        onClick={togglePanel}
        aria-label={
          open ? "Sembunyikan pengalih tema" : "Tampilkan pengalih tema"
        }
        aria-expanded={open}
        title={open ? "Sembunyikan" : "Tampilkan pengalih tema"}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          className="tswitch-chevron"
        >
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
