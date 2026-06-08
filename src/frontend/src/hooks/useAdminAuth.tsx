import { useCallback, useState } from "react";
import { getApiUrl } from "@/lib/apiUrl";

const STORAGE_KEY = "adminSession";

function loadSession(): boolean {
  try {
    return Boolean(localStorage.getItem("auth_token"));
  } catch {
    return false;
  }
}

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState<boolean>(loadSession);

  const adminLogin = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      const apiUrl = getApiUrl();
      try {
        const response = await fetch(`${apiUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: username, password }),
        });

        if (!response.ok) {
          return false;
        }

        const data = await response.json();
        if (data.user?.role === "admin" && data.token) {
          localStorage.setItem("auth_token", data.token);
          localStorage.setItem(STORAGE_KEY, "true");
          setIsAdmin(true);
          return true;
        }
      } catch {
        return false;
      }
      return false;
    },
    [],
  );

  const adminLogout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("auth_token");
    setIsAdmin(false);
  }, []);

  return { isAdmin, adminLogin, adminLogout };
}
