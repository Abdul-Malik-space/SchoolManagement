import api from "./axios";

export const getStudents = (
  params = {}
) => {
  return api.get(
    "/students",
    {
      params
    }
  );
};

export const getAvailableStudentUsers = (
  params = {}
) => {
  return api.get(
    "/students/available-users",
    {
      params
    }
  );
};

export const getDeletedStudents = (
  params = {}
) => {
  return api.get(
    "/students/deleted/list",
    {
      params
    }
  );
};

export const getStudentById = (
  id
) => {
  return api.get(
    `/students/${id}`
  );
};

export const createStudent = (
  payload
) => {
  return api.post(
    "/students",
    payload
  );
};

export const updateStudent = (
  id,
  payload
) => {
  return api.put(
    `/students/${id}`,
    payload
  );
};

export const deleteStudent = (
  id
) => {
  return api.delete(
    `/students/${id}`
  );
};

export const restoreStudent = (
  id
) => {
  return api.patch(
    `/students/${id}/restore`
  );
};