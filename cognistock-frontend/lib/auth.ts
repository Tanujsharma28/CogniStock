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