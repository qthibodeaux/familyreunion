export function buildMagicLinkRedirectUrl({ siteUrl, pathname = "/auth/callback" } = {}) {
  const baseUrl = (siteUrl || process.env.REACT_APP_SITE_URL || "").trim();

  if (!baseUrl) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
    return `${origin}${currentPath.replace(/\/$/, "")}/#${pathname}`;
  }

  const normalizedBase = baseUrl.replace(/\/$/, "");
  const baseWithoutHash = normalizedBase.split("#")[0].replace(/\/$/, "");
  return `${baseWithoutHash}/#${pathname}`;
}
