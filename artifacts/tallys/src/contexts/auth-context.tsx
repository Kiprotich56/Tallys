import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLogin, useLogout, useRegister } from "@workspace/api-client-react";

export interface AuthUser {
  id: number;
  email: string;
  role: "admin" | "customer";
  customerId: number | null;
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isCustomer: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string, name: string, phone: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapToAuthUser(data: any): AuthUser {
  return {
    id: data.id,
    email: data.email,
    role: data.role as "admin" | "customer",
    customerId: data.customerId ?? null,
    name: data.name ?? data.email,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount by calling /auth/me directly
  useEffect(() => {
    const base = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
    fetch(`${base}/api/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data ? mapToAuthUser(data) : null))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const registerMutation = useRegister();

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const result = await loginMutation.mutateAsync({ data: { email, password } });
    const authUser = mapToAuthUser(result);
    setUser(authUser);
    return authUser;
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    phone: string,
  ): Promise<AuthUser> => {
    const result = await registerMutation.mutateAsync({ data: { email, password, name, phone } });
    const authUser = mapToAuthUser(result);
    setUser(authUser);
    return authUser;
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin: user?.role === "admin",
        isCustomer: user?.role === "customer",
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
