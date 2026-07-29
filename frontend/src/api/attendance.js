import api from "./axios";

export const markStudentAttendance = (payload) => {
  return api.post("/attendance/students", payload);
};

export const getStudentAttendance = (params = {}) => {
  return api.get("/attendance/students", {
    params
  });
};

export const getStudentAttendanceById = (id) => {
  return api.get(`/attendance/students/${id}`);
};

export const updateStudentAttendance = (id, payload) => {
  return api.put(`/attendance/students/${id}`, payload);
};

export const deleteStudentAttendance = (id) => {
  return api.delete(`/attendance/students/${id}`);
};
