import api from "./axios";

export const getTeachers = (
  params = {}
) => {
  return api.get(
    "/teachers",
    {
      params
    }
  );
};

export const getAvailableTeacherUsers = (
  params = {}
) => {
  return api.get(
    "/teachers/available-users",
    {
      params
    }
  );
};

export const getDeletedTeachers = (
  params = {}
) => {
  return api.get(
    "/teachers/deleted/list",
    {
      params
    }
  );
};

export const getTeacherById = (
  id
) => {
  return api.get(
    `/teachers/${id}`
  );
};

export const createTeacher = (
  payload
) => {
  return api.post(
    "/teachers",
    payload
  );
};

export const updateTeacher = (
  id,
  payload
) => {
  return api.put(
    `/teachers/${id}`,
    payload
  );
};

export const deleteTeacher = (
  id
) => {
  return api.delete(
    `/teachers/${id}`
  );
};

export const restoreTeacher = (
  id
) => {
  return api.patch(
    `/teachers/${id}/restore`
  );
};