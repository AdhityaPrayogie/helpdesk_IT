import { useState, useRef, useEffect } from "react";

export default function SearchableMultiSelect({
  options,
  value = [],
  onChange,
  placeholder = "Cari...",
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOptions = options.filter((o) =>
    value.some((v) => String(v) === String(o.id)),
  );

  const filtered =
    query.trim() === ""
      ? options
      : options.filter((o) =>
          o.nama.toLowerCase().includes(query.toLowerCase()),
        );

  const toggleOption = (opt) => {
    const isSelected = value.some((v) => String(v) === String(opt.id));
    if (isSelected) {
      onChange(value.filter((v) => String(v) !== String(opt.id)));
    } else {
      onChange([...value, opt.id]);
    }
    setQuery("");
  };

  const removeChip = (id, e) => {
    e.stopPropagation();
    onChange(value.filter((v) => String(v) !== String(id)));
  };

  return (
    <div className="searchable-select" ref={wrapRef}>
      <div className="multiselect-control" onClick={() => setOpen(true)}>
        {selectedOptions.map((opt) => (
          <span key={opt.id} className="multiselect-chip">
            {opt.nama}
            <button
              type="button"
              className="multiselect-chip-remove"
              onClick={(e) => removeChip(opt.id, e)}
              aria-label={`Hapus ${opt.nama}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          className="multiselect-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={selectedOptions.length === 0 ? placeholder : ""}
          autoComplete="off"
        />
      </div>

      {open && (
        <div className="searchable-dropdown">
          {filtered.length === 0 && (
            <div className="searchable-empty">Tidak ditemukan</div>
          )}
          {filtered.slice(0, 50).map((opt) => {
            const isSelected = value.some((v) => String(v) === String(opt.id));
            return (
              <div
                key={opt.id}
                className={`searchable-option ${isSelected ? "selected" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  toggleOption(opt);
                }}
              >
                <span className="multiselect-checkbox">
                  {isSelected ? "✓" : ""}
                </span>
                {opt.nama}
              </div>
            );
          })}
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
