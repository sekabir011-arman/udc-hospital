export const config = {
  // ICP backend host (Vercel + local fallback)
  backendHost:
    import.meta.env.VITE_BACKEND_HOST ||
    "https://icp-api.io",

  // Backend canister ID (MOST IMPORTANT VALUE)
  canisterId:
    import.meta.env.VITE_CANISTER_ID_BACKEND || "",

  // Network type: local | ic
  network:
    import.meta.env.VITE_DFX_NETWORK || "ic",

  // Internet Identity URL
  iiUrl:
    import.meta.env.VITE_II_URL ||
    "https://identity.internetcomputer.org",

  // Identity derivation origin (important for auth consistency)
  derivationOrigin:
    import.meta.env.VITE_II_DERIVATION_ORIGIN || "",

  // Frontend origin (used for auth redirects / cookies)
  frontendOrigin:
    import.meta.env.VITE_FRONTEND_ORIGIN || "",
};
