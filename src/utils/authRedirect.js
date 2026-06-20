export function buildMagicLinkRedirectUrl({ siteUrl } = {}) {
  // 1. Prioritize explicit parameter if provided
  if (siteUrl) {
    return siteUrl.replace(/\/$/, "") + "/";
  }

  // 2. Check if we are in the browser
  if (typeof window !== "undefined" && window.location) {
    const isLocalhost = 
      window.location.hostname === "localhost" || 
      window.location.hostname === "127.0.0.1";

    // If it's NOT localhost and we have the env variable, prioritize the env variable
    const envUrl = (process.env.REACT_APP_SITE_URL || "").trim();
    if (!isLocalhost && envUrl) {
      return envUrl.replace(/\/$/, "") + "/";
    }

    // Otherwise, build it dynamically from window.location
    return window.location.origin + window.location.pathname;
  }

  // 3. Fallback to env variables (mostly for testing/server contexts)
  const baseUrl = (process.env.REACT_APP_SITE_URL || "").trim();
  if (baseUrl) {
    return baseUrl.replace(/\/$/, "") + "/";
  }

  return "/";
}
