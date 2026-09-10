import { createContext, useContext, useEffect, useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import api from "@/lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [googleClientId, setGoogleClientId] = useState("");

  useEffect(() => {
    api
      .get("/auth/google/config")
      .then((r) => setGoogleClientId(r.data.enabled ? r.data.client_id : ""))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((r) => setUser(r.data.user))
      .catch(() => {
        localStorage.removeItem("token");
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const persist = (t, u) => {
    localStorage.setItem("token", t);
    setToken(t);
    setUser(u);
  };

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    persist(r.data.token, r.data.user);
    return r.data.user;
  };

  const register = async (name, email, password) => {
    const r = await api.post("/auth/register", { name, email, password });
    persist(r.data.token, r.data.user);
    return r.data.user;
  };

  const loginGoogle = async (code) => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const r = await api.post("/auth/google", { code, redirect_uri: "postmessage" });
    persist(r.data.token, r.data.user);
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const value = {
    token,
    user,
    loading,
    login,
    register,
    loginGoogle,
    logout,
    googleEnabled: !!googleClientId,
  };

  const tree = <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  return googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>{tree}</GoogleOAuthProvider>
  ) : (
    tree
  );
}
