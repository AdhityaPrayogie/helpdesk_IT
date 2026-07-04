import { useState, useEffect, useRef } from "react";

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Cari...",
  required,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const selected = options.find((o) => String(o.id) === String(value));
    setQuery(selected ? selected.nama : "");
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        const selected = options.find((o) => String(o.id) === String(value));
        setQuery(selected ? selected.nama : "");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, options]);

  const filtered =
    query.trim() === ""
      ? options
      : options.filter((o) =>
          o.nama.toLowerCase().includes(query.toLowerCase()),
        );

  const handleSelect = (opt) => {
    onChange(opt.id);
    setQuery(opt.nama);
    setOpen(false);
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setOpen(true);
    if (value) onChange("");
  };

  return (
    <div className="searchable-select" ref={wrapRef}>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      {open && (
        <div className="searchable-dropdown">
          {filtered.length === 0 && (
            <div className="searchable-empty">Tidak ditemukan</div>
          )}
          {filtered.slice(0, 50).map((opt) => (
            <div
              key={opt.id}
              className={`searchable-option ${String(opt.id) === String(value) ? "selected" : ""}`}
              onMouseDown={() => handleSelect(opt)}
            >
              {opt.nama}
            </div>
          ))}
          {filtered.length > 50 && (
            <div className="searchable-empty">
              Ketik lebih spesifik ({filtered.length} hasil)...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
