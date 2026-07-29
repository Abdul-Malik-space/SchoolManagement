import api from "./axios";

export const getSubjects = (params) => api.get("/subjects", { params });

export const getSubjectById = (id) => api.get(`/subjects/${id}`);

export const createSubject = (payload) => api.post("/subjects", payload);

export const updateSubject = (id, payload) => api.put(`/subjects/${id}`, payload);

export const deleteSubject = (id) => api.delete(`/subjects/${id}`);

export const restoreSubject = (id) => api.patch(`/subjects/${id}/restore`);