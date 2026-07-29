import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api";

/*
 * Main API client
 */
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/*
 * Separate client for refresh-token.
 * اس پر main response interceptor apply نہیں ہوگا۔
 */
const refreshClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/*
 * Page refresh کے بعد بھی token برقرار رہے گا۔
 */
let accessToken =
  localStorage.getItem("accessToken") || null;

export const setAccessToken = (token) => {
  accessToken = token || null;

  if (token) {
    localStorage.setItem(
      "accessToken",
      token
    );
  } else {
    localStorage.removeItem(
      "accessToken"
    );
  }
};

export const getAccessToken = () =>
  accessToken;

/*
 * ہر authenticated request کے ساتھ token بھیجیں۔
 */
api.interceptors.request.use(
  (config) => {
    const token =
      accessToken ||
      localStorage.getItem(
        "accessToken"
      );

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) =>
    Promise.reject(error)
);

let isRefreshing = false;
let pendingQueue = [];

const resolveQueue = (
  error,
  token = null
) => {
  pendingQueue.forEach(
    ({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    }
  );

  pendingQueue = [];
};

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest =
      error.config;

    const status =
      error.response?.status;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl =
      String(
        originalRequest.url || ""
      );

    const isLoginRequest =
      requestUrl.includes(
        "/auth/login"
      );

    const isRefreshRequest =
      requestUrl.includes(
        "/auth/refresh-token"
      );

    /*
     * Login اور refresh-token کی 401 کو
     * دوبارہ refresh نہیں کرنا۔
     */
    if (
      status !== 401 ||
      originalRequest._retry ||
      isLoginRequest ||
      isRefreshRequest
    ) {
      return Promise.reject(error);
    }

    /*
     * اگر refresh پہلے سے جاری ہے تو
     * نئی request queue میں رکھیں۔
     */
    if (isRefreshing) {
      return new Promise(
        (resolve, reject) => {
          pendingQueue.push({
            resolve,
            reject,
          });
        }
      ).then((token) => {
        originalRequest.headers =
          originalRequest.headers || {};

        originalRequest.headers.Authorization =
          `Bearer ${token}`;

        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      /*
       * Separate Axios client استعمال کیا ہے،
       * تاکہ refresh request interceptor loop
       * میں نہ جائے۔
       */
      const { data } =
        await refreshClient.post(
          "/auth/refresh-token",
          {}
        );

      const newToken =
        data?.data?.accessToken ||
        data?.data?.token ||
        data?.accessToken ||
        data?.token;

      if (!newToken) {
        throw new Error(
          "Refresh API did not return an access token"
        );
      }

      setAccessToken(newToken);

      resolveQueue(
        null,
        newToken
      );

      originalRequest.headers =
        originalRequest.headers || {};

      originalRequest.headers.Authorization =
        `Bearer ${newToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      resolveQueue(
        refreshError,
        null
      );

      setAccessToken(null);

      localStorage.removeItem(
        "user"
      );

      if (
        window.location.pathname !==
        "/login"
      ) {
        window.location.replace(
          "/login"
        );
      }

      return Promise.reject(
        refreshError
      );
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;