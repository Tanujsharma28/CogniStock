export const saveToken = (token: string) => {
  localStorage.setItem("cognistock_token", token);
};

export const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cognistock_token");
};

export const removeToken = () => {
  localStorage.removeItem("cognistock_token");
};

export const isLoggedIn = () => {
  return !!getToken();
};

export const getUserRole = (): string | null => {
  const token = getToken();
  if (!token) return null;
  try {
    const base64url = token.split(".")[1];
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return payload.role ?? null; // "ADMIN", "MANAGER", "STAFF"
  } catch {
    return null;
  }
};

export const getUser = (): { email: string; role: string } | null => {
  const token = getToken();
  if (!token) return null;
  try {
    const base64url = token.split(".")[1];
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return {
      email: payload.sub ?? payload.email ?? "",
      role: payload.role ?? "",
    };
  } catch {
    return null;
  }
};

export const canApproveOrders = (): boolean => {
  const role = getUserRole();
  return role === "ADMIN" || role === "MANAGER";
};