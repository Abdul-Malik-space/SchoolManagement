import api from "./axios";

export const getUsers = (params = {}) => {
  return api.get("/users", {
    params,
  });
};

export const getUserById = (id) => {
  return api.get(`/users/${id}`);
};

export const createUser = (payload) => {
  return api.post("/users", payload);
};

export const updateUser = (id, payload) => {
  return api.put(`/users/${id}`, payload);
};

export const updateUserStatus = (id, isActive) => {
  return api.patch(`/users/${id}/status`, {
    isActive,
  });
};

export const resetUserPassword = (id, password) => {
  return api.patch(`/users/${id}/reset-password`, {
    password,
  });
};