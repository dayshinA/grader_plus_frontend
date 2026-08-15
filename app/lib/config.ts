const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!rawApiBaseUrl) {
  throw new Error(
    "VITE_API_BASE_URL is not set. Copy .env.example to .env and point it at the running backend.",
  );
}

export const config = {
  apiBaseUrl: rawApiBaseUrl.replace(/\/$/, ""),
};
