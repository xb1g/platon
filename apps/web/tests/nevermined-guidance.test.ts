import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readFixture = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("Nevermined guidance alignment", () => {
  it("keeps the integration markdown on the x402 path", () => {
    const integrationDoc = readFixture("../docs/INTEGRATION.md");

    expect(integrationDoc).toContain("payments.x402.getX402AccessToken");
    expect(integrationDoc).toContain("Authorization: Bearer <x402-access-token>");
    expect(integrationDoc).toContain("payment-signature: $X402_ACCESS_TOKEN");
    expect(integrationDoc).toContain("@nevermined-io/payments@1.0.0-rc14");
  });

  it("removes stale PLATON_API_KEY examples from the how-it-works page", () => {
    const howItWorksPage = readFixture("../app/(marketing)/how-it-works/page.tsx");

    expect(howItWorksPage).not.toContain("PLATON_API_KEY");
    expect(howItWorksPage).toContain("NVM_SUBSCRIBER_API_KEY");
    expect(howItWorksPage).toContain("X402_ACCESS_TOKEN");
  });
});
