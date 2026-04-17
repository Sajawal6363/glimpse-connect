const normalizeBaseUrl = (url: string) => url.replace(/\/$/, "");

export const APP_URL = normalizeBaseUrl(
  import.meta.env.VITE_APP_URL || window.location.origin,
);

export const APP_NAME = import.meta.env.VITE_APP_NAME || "GlimseConnect";

export const APP_OG_IMAGE_PATH = "/og-image.png";
export const APP_OG_IMAGE_URL = `${APP_URL}${APP_OG_IMAGE_PATH}`;

export const getAbsoluteAppUrl = (path = "/") => {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return `${APP_URL}${safePath}`;
};
