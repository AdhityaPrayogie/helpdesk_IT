import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getLogbookHistory } from "../api";

const formatWaktu = (isoStr) => {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Field status ditampilkan sebagai badge warna, field lain sebagai teks biasa
const isStatusField = (fieldName) => fieldName === "status";

const displayValue = (val) => {
  if (val === null || val === undefined || val === "") return "(kosong)";
  return val;
};

export default function LogbookHistoryModal({ logbookId, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadHistory();
  }, [logbookId]);

  const loadHistory = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await getLogbookHistory(logbookId);
      // Tampilkan yang paling baru di atas
      setHistory([...res.data].reverse());
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal memuat riwayat perubahan.");
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box modal-box-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Riwayat Perubahan</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {loading && <p className="muted">Memuat riwayat...</p>}
        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

        {!loading && !errorMsg && history.length === 0 && (
          <p className="muted">Belum ada riwayat perubahan.</p>
        )}

        {!loading && history.length > 0 && (
          <div className="history-batch-list">
            {history.map((batch) => (
              <div key={batch.id} className="history-batch">
                <div className="history-batch-header">
                  <span className="history-batch-aksi">
                    {batch.aksi === "create" ? "Tiket dibuat" : "Tiket diubah"}
                  </span>
                  <span className="history-batch-meta">
                    {formatWaktu(batch.created_at)}
                    {batch.changed_by_nama &&
                      ` · oleh ${batch.changed_by_nama}`}
                  </span>
                </div>

                <ul className="history-field-list">
                  {batch.details.map((d) => (
                    <li key={d.id} className="history-field-item">
                      <span className="history-field-label">
                        {d.label_field}
                      </span>
                      <span className="history-field-value">
                        {batch.aksi === "create" ? (
                          isStatusField(d.field_name) ? (
                            <span
                              className={`badge badge-${String(
                                d.nilai_baru,
                              ).toLowerCase()}`}
                            >
                              {d.nilai_baru}
                            </span>
                          ) : (
                            <span className="history-value-new">
                              {displayValue(d.nilai_baru)}
                            </span>
                          )
                        ) : isStatusField(d.field_name) ? (
                          <>
                            <span
                              className={`badge badge-${String(
                                d.nilai_lama,
                              ).toLowerCase()}`}
                            >
                              {displayValue(d.nilai_lama)}
                            </span>
                            <span className="history-arrow">{"\u2192"}</span>
                            <span
                              className={`badge badge-${String(
                                d.nilai_baru,
                              ).toLowerCase()}`}
                            >
                              {displayValue(d.nilai_baru)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="history-value-old">
                              {displayValue(d.nilai_lama)}
                            </span>
                            <span className="history-arrow">{"\u2192"}</span>
                            <span className="history-value-new">
                              {displayValue(d.nilai_baru)}
                            </span>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
