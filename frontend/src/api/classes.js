import api from "./axios";

export const getClasses = (params) => api.get("/classes", { params });

export const getClassById = (id) => api.get(`/classes/${id}`);

export const createClass = (payload) => api.post("/classes", payload);

export const updateClass = (id, payload) => api.put(`/classes/${id}`, payload);

export const deleteClass = (id) => api.delete(`/classes/${id}`);

export const restoreClass = (id) => api.patch(`/classes/${id}/restore`);
