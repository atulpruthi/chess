// In development, use relative URLs to leverage Vite proxy and avoid CORS issues
// In production, use the full API URL from environment variable
const isDevelopment = import.meta.env.DEV;
const API_URL = isDevelopment 
  ? '' // Use relative URLs in dev (proxied by Vite)
  : (import.meta.env.VITE_API_URL || 'http://localhost:5001');

export const config = {
  apiUrl: API_URL,
  wsUrl: isDevelopment ? '' : API_URL.replace('http', 'ws'),
};
