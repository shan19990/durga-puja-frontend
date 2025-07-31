export const getAccessTokenFromCookie = (): string => {
  const match = document.cookie.match(/access=([^;]+)/);
  if (!match) return "";
  return match[1];
};
