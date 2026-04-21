import React, { createContext, useContext, useMemo, useState } from "react";
import { authStorage } from "./authStorage";
import { parseJwt, JwtClaims } from "./jwt";

type AuthState = {
  token: string | null;
  claims: JwtClaims | null;
  isAuthenticated: boolean;
};

type AuthContextValue = AuthState & {
  loginWithToken: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function computeState(token: string | null): AuthState {
  const claims = token ? parseJwt(token) : null;
  return { token, claims, isAuthenticated: Boolean(token) };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => authStorage.getToken());

  const value = useMemo<AuthContextValue>(() => {
    const state = computeState(token);
    return {
      ...state,
      loginWithToken: (t) => {
        authStorage.setToken(t);
        setToken(t);
      },
      logout: () => {
        authStorage.clear();
        setToken(null);
      }
    };
  }, [token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

