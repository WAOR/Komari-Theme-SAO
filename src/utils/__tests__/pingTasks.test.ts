import { describe, expect, it } from "vitest";
import {
  assignHomepageMultiPingTask,
  HOMEPAGE_MULTI_PING_MAX_COUNT,
  HOMEPAGE_MULTI_PING_MIN_COUNT,
  isHomepageMultiPingConfigured,
  normalizeHomepageMultiPingTaskIds,
  invertHomepagePingTaskBindings,
  hasHomepagePingTaskBinding,
  normalizeHomepagePingTaskBindings,
  resolveHomepagePingSelections,
  resolveHomepagePingTaskIdsByClient,
} from "@/utils/pingTasks";

describe("homepage ping task bindings", () => {
  it("accepts only positive decimal safe integers", () => {
    expect(
      normalizeHomepagePingTaskBindings({
        "1e3": ["exponent"],
        "1.5": ["fraction"],
        "0x10": ["hex"],
        "9007199254740992": ["unsafe"],
        "42": ["valid"],
      }),
    ).toEqual({ "42": ["valid"] });
  });

  it("merges IDs that normalize to the same decimal integer", () => {
    expect(
      normalizeHomepagePingTaskBindings({
        "01": ["node-a", "node-b"],
        "1": ["node-b", "node-c"],
      }),
    ).toEqual({ "1": ["node-b", "node-c", "node-a"] });
  });

  it("inverts normalized bindings and gives the lowest task ID precedence", () => {
    expect(
      invertHomepagePingTaskBindings({
        "02": ["node-a"],
        "1": ["node-a", "node-b"],
      }),
    ).toEqual(
      new Map([
        ["node-a", 1],
        ["node-b", 1],
      ]),
    );
  });

  it("reuses the inverted binding index for a stable bindings object", () => {
    const bindings = { "8": ["node-a"], "9": ["node-b"] };
    expect(invertHomepagePingTaskBindings(bindings)).toBe(
      invertHomepagePingTaskBindings(bindings),
    );
  });

  it("reports a binding before overview data has loaded", () => {
    const bindings = { "8": ["node-a"], "9": ["node-b"] };
    expect(hasHomepagePingTaskBinding("node-a", bindings)).toBe(true);
    expect(hasHomepagePingTaskBinding("node-c", bindings)).toBe(false);
  });

  it("normalizes the multi-task selection up to max count in display order", () => {
    expect(normalizeHomepageMultiPingTaskIds(["3", 1, 3, 2, 4])).toEqual([3, 1, 2, 4]);
    expect(
      normalizeHomepageMultiPingTaskIds([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(HOMEPAGE_MULTI_PING_MAX_COUNT).toBe(8);
    expect(HOMEPAGE_MULTI_PING_MIN_COUNT).toBe(1);
  });

  it("checks whether homepage multi-ping is configured", () => {
    expect(isHomepageMultiPingConfigured([])).toBe(false);
    expect(isHomepageMultiPingConfigured([1])).toBe(true);
    expect(isHomepageMultiPingConfigured([1, 2, 3, 4, 5, 6])).toBe(true);
  });

  it("assigns tasks to slots and swaps when selecting an already chosen task", () => {
    expect(assignHomepageMultiPingTask([1, 2, 3], 1, 4)).toEqual([1, 4, 3]);
    expect(assignHomepageMultiPingTask([1, 2, 3], 0, 2)).toEqual([2, 1, 3]);
    expect(assignHomepageMultiPingTask([1, 2, 3], 5, 4)).toEqual([1, 2, 3]);
  });

  it("uses the same three global tasks for every node and otherwise keeps single bindings", () => {
    const bindings = { "8": ["node-a"], "9": ["node-b"] };
    expect(
      resolveHomepagePingTaskIdsByClient(["node-a", "node-b"], bindings, [3, 1, 2]),
    ).toEqual(
      new Map([
        ["node-a", [3, 1, 2]],
        ["node-b", [3, 1, 2]],
      ]),
    );
    expect(resolveHomepagePingTaskIdsByClient(["node-a", "node-b"], bindings)).toEqual(
      new Map([
        ["node-a", [8]],
        ["node-b", [9]],
      ]),
    );
  });

  it("requests either global multi-ping tasks or per-node single bindings, never both", () => {
    const multiSelections = resolveHomepagePingSelections(
      ["node-a", "node-b"],
      { "8": ["node-a"], "9": ["node-b"] },
      [3, 1, 2],
    );

    expect(multiSelections.singleTaskIdsByClient).toEqual(new Map());
    expect(multiSelections.multiTaskIdsByClient).toEqual(
      new Map([
        ["node-a", [3, 1, 2]],
        ["node-b", [3, 1, 2]],
      ]),
    );
    expect(multiSelections.requestedTaskIdsByClient).toBe(
      multiSelections.multiTaskIdsByClient,
    );

    const singleSelections = resolveHomepagePingSelections(
      ["node-a", "node-b"],
      { "8": ["node-a"], "9": ["node-b"] },
    );
    expect(singleSelections.singleTaskIdsByClient).toEqual(
      new Map([
        ["node-a", [8]],
        ["node-b", [9]],
      ]),
    );
    expect(singleSelections.multiTaskIdsByClient).toEqual(new Map());
    expect(singleSelections.requestedTaskIdsByClient).toBe(
      singleSelections.singleTaskIdsByClient,
    );
  });
});
