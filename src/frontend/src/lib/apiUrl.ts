export function getApiUrl(): string {
  return (
    import.meta.env.VITE_API_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  );
}
