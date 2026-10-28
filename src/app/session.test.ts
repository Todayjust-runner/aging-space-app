import { describe, expect, it } from "vitest";
import { initialSession, sessionReducer, restoreSession } from "./session";
import { createSessionStorage } from "../services/storage";

describe("assessment session", () => {
  it("cannot jump to a report without completing assessment", () => {
    expect(
      sessionReducer(initialSession, { type: "navigate", step: "report" }).step,
    ).toBe("profile");
  });
  it("clears downstream data on room changes and retakes", () => {
    const stale = {
      ...initialSession,
      step: "report",
      spaceId: "bathroom",
      status: "success",
      captures: [
        {
          id: "1",
          taskId: "bathroom_overview",
          spaceId: "bathroom",
          source: "mock",
          uri: "/sample.png",
          capturedAt: "now",
        },
      ],
      result: { id: "old" },
      selectedIds: ["old"],
      confirmed: true,
    } as never;
    expect(
      sessionReducer(stale, { type: "selectSpace", spaceId: "bedroom" }),
    ).toMatchObject({
      spaceId: "bedroom",
      captures: [],
      result: null,
      selectedIds: [],
      confirmed: false,
    });
    expect(
      sessionReducer(stale, { type: "retake", taskId: "bathroom_overview" }),
    ).toMatchObject({
      step: "capture",
      captures: [],
      result: null,
      selectedIds: [],
      confirmed: false,
    });
  });
  it("does not accept a late result after the inputs changed", () => {
    const state = sessionReducer(initialSession, {
      type: "selectSpace",
      spaceId: "bedroom",
    });
    expect(
      sessionReducer(state, {
        type: "succeeded",
        revision: -1,
        result: { spaceId: "bathroom" } as never,
      }).result,
    ).toBeNull();
  });
  it("never restores a forged report or sample evidence into api mode", () => {
    const restored = restoreSession(
      {
        step: "confirm",
        spaceId: "bathroom",
        captures: [{ taskId: "unknown", source: "mock" }],
        selectedIds: ["unknown"],
        confirmed: true,
        result: { source: "mock", safetyValue: "100" },
      },
      "api",
    );
    expect(restored.result).toBeNull();
    expect(restored.captures).toEqual([]);
    expect(restored.confirmed).toBe(false);
    expect(restored.step).not.toBe("confirm");
  });
  it("preserves plan progress if refresh interrupts restoration", () => {
    const profile = {
      age: "75",
      living: "独居",
      mobility: "使用手杖",
      vision: "弱光下视物困难",
      balance: "平衡能力受限",
      fallHistory: "有跌倒经历",
      night: "起夜频繁",
      spaceUseFrequency: "4",
    };
    const captures = [
      "bathroom_overview",
      "shower_floor",
      "toilet_support",
      "threshold",
    ].map((taskId) => ({
      id: taskId,
      taskId,
      spaceId: "bathroom",
      source: "mock",
      uri: "/sample.png",
      capturedAt: "now",
    }));
    const restoring = restoreSession(
      {
        profile,
        captures,
        spaceId: "bathroom",
        step: "confirm",
        selectedIds: ["solution-1"],
        confirmed: true,
      },
      "mock",
    );
    const interrupted = restoreSession(restoring, "mock");
    expect(interrupted.resume).toEqual({
      step: "confirm",
      selectedIds: ["solution-1"],
      confirmed: true,
    });
  });
  it("uses independent storage and tolerates malformed or unavailable storage", () => {
    const values = new Map([["zhihui-aging-demo:v7", '{"step":6}']]);
    const storage = createSessionStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    });
    expect(storage.load()).toBeNull();
    storage.save({ step: "space" });
    expect(storage.load()).toEqual({ step: "space" });
    storage.clear();
    expect(values.has("zhihui-aging-demo:v7")).toBe(true);
    const broken = createSessionStorage({
      getItem() {
        throw Error("blocked");
      },
      setItem() {
        throw Error("full");
      },
      removeItem() {
        throw Error("blocked");
      },
    });
    expect(broken.load()).toBeNull();
    expect(broken.save({})).toBe(false);
    expect(() => broken.clear()).not.toThrow();
  });
});
