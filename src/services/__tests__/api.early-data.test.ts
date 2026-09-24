import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpcCallMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/rpc2Client", () => ({
  getRpc2Client: () => ({ call: rpcCallMock }),
}));

import { getMe, getPublic } from "@/services/api";

type EarlyDataMap = Record<string, Promise<unknown> | null>;
function getEarlyWindow(): { __EARLY_DATA__?: EarlyDataMap } {
  return window as unknown as { __EARLY_DATA__?: EarlyDataMap };
}

describe("Early Data prefetch consumption", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      __EARLY_DATA__: undefined,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    rpcCallMock.mockReset();
  });

  it("consumes early public config without initiating a new fetch roundtrip", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    getEarlyWindow().__EARLY_DATA__ = {
      public: Promise.resolve({
        status: "success",
        data: { sitename: "Early Site", version: "1.0.0" },
      }),
    };

    const config = await getPublic();
    expect(config.sitename).toBe("Early Site");
    // fetch 不应被调用，因为直接消费了早期数据
    expect(fetchMock).not.toHaveBeenCalled();
    // 消费后应当置空，防止后续轮询取到过时数据
    expect(getEarlyWindow().__EARLY_DATA__?.public).toBeNull();
  });

  it("consumes early auth status and falls back to normal fetch once cleared", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          logged_in: true,
          username: "fresh-user",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    getEarlyWindow().__EARLY_DATA__ = {
      me: Promise.resolve({
        logged_in: false,
      }),
    };

    const firstMe = await getMe();
    expect(firstMe.logged_in).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();

    // 再次调用时早期数据已置空，应调用常规 fetch
    const secondMe = await getMe();
    expect(secondMe.logged_in).toBe(true);
    expect(secondMe.username).toBe("fresh-user");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
