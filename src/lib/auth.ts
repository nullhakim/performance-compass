export const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") return true; // Bypass SSR check to avoid false redirects
  return localStorage.getItem("isAuthenticated") === "true";
};

export const login = (username?: string, password?: string): boolean => {
  const envUsername = import.meta.env.VITE_AUTH_USERNAME;
  const envPassword = import.meta.env.VITE_AUTH_PASSWORD;

  if (username === envUsername && password === envPassword) {
    if (typeof window !== "undefined") {
      localStorage.setItem("isAuthenticated", "true");
    }
    return true;
  }
  return false;
};

export const logout = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("isAuthenticated");
  }
};
