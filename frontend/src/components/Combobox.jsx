import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

// Combobox gaya shadcn (Popover + Command): tombol, panel cari, daftar centang.
// Pilih satu: panel menutup (klik item terpilih lagi = batal, kecuali clearable={false}).
// multiple: value = array id, panel tetap terbuka.
// searchable={false} = Select biasa tanpa kolom cari. summary(terpilih) = teks tombol sendiri.
// bulk = tombol "Pilih semua / Kosongkan" (multiple saja).
// ponytail: panel absolute tanpa flip/portal, pakai Radix Popover kalau terpotong di tepi layar.
export default function Combobox({
  options = [],
  value,
  onChange,
  placeholder = "Pilih...",
  multiple = false,
  searchable = true,
  clearable = true,
  summary,
  bulk = false,
  id,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const focusRef = useRef(null);
  const listRef = useRef(null);

  const ids = multiple ? (value ?? []) : value === "" || value == null ? [] : [value];
  const isSelected = (o) => ids.some((v) => String(v) === String(o.id));
  const selected = options.filter(isSelected);
  const label = summary ? summary(selected) : selected.map((o) => o.nama).join(", ");
  const filtered = options.filter((o) =>
    o.nama.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  useEffect(() => {
    if (open) focusRef.current?.focus();
  }, [open]);

  const openPanel = () => {
    setActive(Math.max(0, options.findIndex(isSelected)));
    setOpen(true);
  };

  const toggle = (o) => {
    if (multiple) {
      onChange(
        isSelected(o)
          ? ids.filter((v) => String(v) !== String(o.id))
          : [...ids, o.id],
      );
    } else {
      onChange(isSelected(o) && clearable ? "" : o.id);
      close();
      triggerRef.current?.focus();
    }
  };

  const onPanelKey = (e) => {
    const last = filtered.length - 1;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (last < 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a + step + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault(); // jangan submit form
      if (filtered[active]) toggle(filtered[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
      triggerRef.current?.focus();
    } else if (e.key === "Tab") {
      close();
    }
  };

  return (
    <div className="combobox" ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        id={id}
        className="combobox-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            openPanel();
          }
        }}
      >
        <span className={`combobox-value ${label ? "" : "is-placeholder"}`}>
          {label || placeholder}
        </span>
        <ChevronsUpDown size={16} aria-hidden="true" />
      </button>

      {open && (
        <div className="combobox-popover" onKeyDown={onPanelKey}>
          {searchable && (
            <div className="combobox-search">
              <Search size={16} aria-hidden="true" />
              <input
                ref={focusRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder="Cari..."
                autoComplete="off"
                aria-label="Cari"
              />
            </div>
          )}
          {multiple && bulk && (
            <div className="combobox-bulk">
              <button type="button" onClick={() => onChange(options.map((o) => o.id))}>
                Pilih semua
              </button>
              <button type="button" onClick={() => onChange([])}>
                Kosongkan
              </button>
            </div>
          )}
          <div
            className="combobox-list"
            role="listbox"
            aria-multiselectable={multiple}
            tabIndex={-1}
            ref={(el) => {
              listRef.current = el;
              if (!searchable) focusRef.current = el;
            }}
          >
            {filtered.length === 0 && (
              <div className="combobox-empty">Tidak ditemukan.</div>
            )}
            {filtered.map((o, i) => (
              <div
                key={o.id}
                role="option"
                aria-selected={isSelected(o)}
                data-active={i === active}
                className={`combobox-item ${isSelected(o) ? "selected" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault(); // pertahankan fokus di kolom cari
                  toggle(o);
                }}
              >
                <Check className="combobox-check" size={16} aria-hidden="true" />
                <span>{o.nama}</span>
                {o.aktif === 0 && <span className="badge-inactive">Nonaktif</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
