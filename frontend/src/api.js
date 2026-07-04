import axios from "axios";

// ===== FUNGSI UNTUK BASEURL =====
// Diambil dari environment variable VITE_API_URL (di-set saat build/deploy).
// Fallback ke localhost:5000 untuk development lokal.
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return `${envUrl.replace(/\/$/, "")}/api`;
  return "http://localhost:5000/api";
};

// ===== INSTANCE AXIOS =====
const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true, // wajib agar cookie httpOnly ikut terkirim
  headers: {
    "ngrok-skip-browser-warning": "true", // skip halaman warning ngrok free tier
  },
});

// ===== INTERCEPTOR RESPONSE =====
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthCheck = error.config?.url?.includes("/auth/me");

    if (error.response?.status === 401 && !isAuthCheck) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// ===== EXPORT FUNGSI API =====
export const getPic = (all = false) =>
  api.get("/pic", { params: all ? { all: 1 } : {} });
export const createPic = (data) => api.post("/pic", data);
export const setPicAktif = (id, aktif) => api.put(`/pic/${id}`, { aktif });
export const deletePic = (id) => api.delete(`/pic/${id}`);

export const getStaffIt = (all = false) =>
  api.get("/staff-it", { params: all ? { all: 1 } : {} });
export const createStaffIt = (data) => api.post("/staff-it", data);
export const setStaffItAktif = (id, aktif) =>
  api.put(`/staff-it/${id}`, { aktif });
export const deleteStaffIt = (id) => api.delete(`/staff-it/${id}`);

export const getKategori = (all = false) =>
  api.get("/kategori", { params: all ? { all: 1 } : {} });
export const createKategori = (data) => api.post("/kategori", data);
export const setKategoriAktif = (id, aktif) =>
  api.put(`/kategori/${id}`, { aktif });
export const deleteKategori = (id) => api.delete(`/kategori/${id}`);

export const getUnitKerja = (all = false) =>
  api.get("/unit-kerja", { params: all ? { all: 1 } : {} });
export const createUnitKerja = (data) => api.post("/unit-kerja", data);
export const setUnitKerjaAktif = (id, aktif) =>
  api.put(`/unit-kerja/${id}`, { aktif });
export const deleteUnitKerja = (id) => api.delete(`/unit-kerja/${id}`);

export const getLogbook = (params) => api.get("/logbook", { params });
export const createLogbook = (data) => api.post("/logbook", data);
export const updateLogbook = (id, data) => api.put(`/logbook/${id}`, data);
export const deleteLogbook = (id) => api.delete(`/logbook/${id}`);
export const getLogbookHistory = (id) => api.get(`/logbook/${id}/history`);

export const getUsers = () => api.get("/users");
export const createUser = (data) => api.post("/users", data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const resetUserPassword = (id, password) =>
  api.put(`/users/${id}/password`, { password });
export const deleteUser = (id) => api.delete(`/users/${id}`);

// ===== EXPORT CSV (juga dinamis) =====
export const exportCsvUrl = (start, end) =>
  `${getBaseUrl()}/logbook/export/csv?start=${start}&end=${end}`;

export default api;
