import { createContext, useContext, ReactNode } from "react";
import {
  useGetMe,
  useLogin,
  useLogout,
  useRegister,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useGetMe();

  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const registerMutation = useRegister();

  const user: AuthUser | null = me
    ? {
        id: me.id,
        email: me.email,
        role: me.role as "admin" | "customer",
        customerId: me.customerId ?? null,
        name: me.name,
      }
    : null;

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const result = await loginMutation.mutateAsync({ data: { email, password } });
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    return {
      id: result.id,
      email: result.email,
      role: result.role as "admin" | "customer",
      customerId: result.customerId ?? null,
      name: result.name,
    };
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    phone: string,
  ): Promise<AuthUser> => {
    const result = await registerMutation.mutateAsync({ data: { email, password, name, phone } });
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    return {
      id: result.id,
      email: result.email,
      role: result.role as "admin" | "customer",
      customerId: result.customerId ?? null,
      name: result.name,
    };
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
    queryClient.clear();
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
