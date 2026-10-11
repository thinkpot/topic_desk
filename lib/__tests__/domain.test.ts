import { describe, expect, it } from "vitest";
import { isDomainAllowed } from "@/lib/domain";

describe("isDomainAllowed", () => {
  it("allows anything when no restriction is configured", () => {
    expect(isDomainAllowed(null, "https://anywhere.example.com")).toBe(true);
    expect(isDomainAllowed(null, null)).toBe(true);
  });

  it("rejects a missing Origin header once a restriction is set", () => {
    expect(isDomainAllowed("example.com", null)).toBe(false);
  });

  it("allows an exact host match", () => {
    expect(isDomainAllowed("example.com", "https://example.com")).toBe(true);
  });

  it("is case-insensitive and tolerates spacing in the CSV list", () => {
    expect(isDomainAllowed(" Example.com , Other.com ", "https://example.com")).toBe(true);
  });

  it("rejects a host not on the list", () => {
    expect(isDomainAllowed("example.com", "https://evil.com")).toBe(false);
  });

  it("rejects a malformed Origin header rather than throwing", () => {
    expect(isDomainAllowed("example.com", "not-a-url")).toBe(false);
  });

  // Documents a known gap (flagged in the project's audit, not fixed here):
  // matching is exact, so a bare domain on the allowlist does NOT also cover
  // its www subdomain. Owners must list both if they want both to work.
  it("does NOT treat a bare domain and its www subdomain as equivalent", () => {
    expect(isDomainAllowed("example.com", "https://www.example.com")).toBe(false);
    expect(isDomainAllowed("www.example.com", "https://example.com")).toBe(false);
  });
});
