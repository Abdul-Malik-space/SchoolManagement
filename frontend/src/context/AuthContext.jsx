import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { loginRequest, logoutRequest, getMeRequest } from "../api/auth";
import { setAccessToken } from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const hydrateSession = useCallback(async () => {
    try {
      const { data } = await getMeRequest();
      setUser(data?.data || data?.user || null);
    } catch (error) {
      setUser(null);
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const login = async (email, password) => {
    const { data } = await loginRequest(email, password);
    const token = data?.data?.accessToken || data?.accessToken;
    const loggedInUser = data?.data?.user || data?.user;

    setAccessToken(token);
    setUser(loggedInUser);

    return loggedInUser;
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, initializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
