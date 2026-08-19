import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DESCRIPTION_STORAGE_KEY,
  FALLBACK_DESCRIPTION,
  FALLBACK_TITLE,
  SITENAME_STORAGE_KEY,
  applySiteMetadata,
  persistSiteMetadata,
  readStoredSiteMetadata,
  resolveSiteMetadata,
} from "@/hooks/useSiteMetadata";

describe("useSiteMetadata", () => {
  let entries: Map<string, string>;
  let elements: Map<string, { content: string; getAttribute: (attr: string) => string | null }>;
  let fakeDocument: {
    title: string;
    querySelector: (sel: string) => { content: string; getAttribute: (attr: string) => string | null } | null;
  };

  beforeEach(() => {
    entries = new Map();
    const localStorageMock = {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
      removeItem: (key: string) => entries.delete(key),
      clear: () => entries.clear(),
    };
    vi.stubGlobal("localStorage", localStorageMock);

    elements = new Map();
    fakeDocument = {
      title: "",
      querySelector: (sel: string) => {
        if (!elements.has(sel)) {
          const el = {
            content: "",
            getAttribute: (attr: string) => (attr === "content" ? el.content : null),
          };
          elements.set(sel, el);
        }
        return elements.get(sel)!;
      },
    };
    vi.stubGlobal("document", fakeDocument);
  });

  describe("resolveSiteMetadata", () => {
    it("uses config values when available", () => {
      const res = resolveSiteMetadata(
        "My Server Status",
        "Custom Description",
        "Cached Status",
        "Cached Description",
      );
      expect(res.siteName).toBe("My Server Status");
      expect(res.description).toBe("Custom Description");
    });

    it("falls back to cached values when config is null/undefined/empty", () => {
      const res = resolveSiteMetadata(
        "",
        undefined,
        "Cached Status",
        "Cached Description",
      );
      expect(res.siteName).toBe("Cached Status");
      expect(res.description).toBe("Cached Description");
    });

    it("falls back to theme default constants when neither config nor cache exists", () => {
      const res = resolveSiteMetadata(null, null, null, null);
      expect(res.siteName).toBe(FALLBACK_TITLE);
      expect(res.description).toBe(FALLBACK_DESCRIPTION);
      expect(FALLBACK_TITLE).toBe("Komari-Theme-SAO");
    });
  });

  describe("storage operations", () => {
    it("persists and reads site metadata in localStorage", () => {
      persistSiteMetadata("Ops Monitor", "Ops Description");
      expect(entries.get(SITENAME_STORAGE_KEY)).toBe("Ops Monitor");
      expect(entries.get(DESCRIPTION_STORAGE_KEY)).toBe("Ops Description");

      const stored = readStoredSiteMetadata();
      expect(stored.siteName).toBe("Ops Monitor");
      expect(stored.description).toBe("Ops Description");
    });

    it("returns null for non-existent storage items", () => {
      const stored = readStoredSiteMetadata();
      expect(stored.siteName).toBeNull();
      expect(stored.description).toBeNull();
    });
  });

  describe("applySiteMetadata", () => {
    it("updates document.title and all relevant meta tags", () => {
      applySiteMetadata("Test Site", "Test Desc");

      expect(fakeDocument.title).toBe("Test Site");
      expect(
        fakeDocument.querySelector('meta[name="apple-mobile-web-app-title"]')?.getAttribute("content"),
      ).toBe("Test Site");
      expect(
        fakeDocument.querySelector('meta[property="og:title"]')?.getAttribute("content"),
      ).toBe("Test Site");
      expect(
        fakeDocument.querySelector('meta[name="twitter:title"]')?.getAttribute("content"),
      ).toBe("Test Site");
      expect(
        fakeDocument.querySelector('meta[name="description"]')?.getAttribute("content"),
      ).toBe("Test Desc");
      expect(
        fakeDocument.querySelector('meta[property="og:description"]')?.getAttribute("content"),
      ).toBe("Test Desc");
      expect(
        fakeDocument.querySelector('meta[name="twitter:description"]')?.getAttribute("content"),
      ).toBe("Test Desc");
    });
  });
});
