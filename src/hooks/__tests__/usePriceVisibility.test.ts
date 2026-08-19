import { describe, expect, it } from "vitest";
import { resolvePriceVisibility } from "@/hooks/usePriceVisibility";

describe("resolvePriceVisibility", () => {
  it("strictly follows showPriceForGuests when user is not logged in", () => {
    // 未登录时，不受 override 影响，严格遵守 showPriceForGuests
    expect(resolvePriceVisibility(false, false, null)).toBe(false);
    expect(resolvePriceVisibility(false, false, "visible")).toBe(false);
    expect(resolvePriceVisibility(false, true, null)).toBe(true);
    expect(resolvePriceVisibility(false, true, "hidden")).toBe(true);
  });

  it("defaults to visible for logged-in admin regardless of showPriceForGuests", () => {
    expect(resolvePriceVisibility(true, false, null)).toBe(true);
    expect(resolvePriceVisibility(true, true, null)).toBe(true);
    expect(resolvePriceVisibility(true, false, "visible")).toBe(true);
  });

  it("respects temporary hidden override for logged-in admin", () => {
    expect(resolvePriceVisibility(true, true, "hidden")).toBe(false);
    expect(resolvePriceVisibility(true, false, "hidden")).toBe(false);
  });
});
