import api from "./axios";

export const loginRequest = (email, password) =>
  api.post("/auth/login", { email, password });

export const logoutRequest = () => api.post("/auth/logout");

export const getMeRequest = () => api.get("/auth/me");

export const updateProfileRequest = (payload) =>
  api.put("/auth/update-profile", payload);

export const changePasswordRequest = (payload) =>
  api.put("/auth/change-password", payload);
