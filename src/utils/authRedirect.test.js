import { buildMagicLinkRedirectUrl } from "./authRedirect";

describe("buildMagicLinkRedirectUrl", () => {
  it("builds a hash-router callback URL from the configured site URL", () => {
    expect(buildMagicLinkRedirectUrl({ siteUrl: "https://example.com/familyreunion" })).toBe(
      "https://example.com/familyreunion/#/auth/callback"
    );
  });

  it("reuses the existing base URL when the site URL already contains a hash", () => {
    expect(buildMagicLinkRedirectUrl({ siteUrl: "https://example.com/familyreunion/#/register" })).toBe(
      "https://example.com/familyreunion/#/auth/callback"
    );
  });
});
