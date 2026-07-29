import api from "./axios";

export const getSchools = (params) => api.get("/schools", { params });

export const getSchoolById = (id) => api.get(`/schools/${id}`);

export const createSchool = (payload) => api.post("/schools", payload);

export const updateSchool = (id, payload) => api.put(`/schools/${id}`, payload);
