import { describe, expect, it } from "vitest";
import { createServices, resolveMode } from "./index";
import { existsSync } from "node:fs";
import path from "node:path";

const profile = {
  age: "75",
  living: "独居",
  mobility: "使用手杖",
  vision: "弱光下视物困难",
  grip: "起身需要借力",
  assistance: "部分动作需辅助",
  balance: "平衡能力受限",
  fallHistory: "有跌倒经历",
  night: "起夜频繁",
  spaceUseFrequency: "4",
  focus: "防跌倒",
  notes: "",
};

describe("service boundary", () => {
  it("defaults production to api and requires an explicit mock opt-in", () => {
    expect(resolveMode(undefined, false)).toBe("api");
    expect(resolveMode(undefined, true)).toBe("mock");
    expect(resolveMode("mock", false)).toBe("mock");
    expect(resolveMode("unexpected", true)).toBe("api");
  });

  it("never returns a sample from the unconfigured api adapter", async () => {
    const services = createServices("api");
    await expect(
      services.assessment.analyze({
        profile,
        spaceId: "bathroom",
        captures: [],
      }),
    ).rejects.toMatchObject({ code: "SERVICE_NOT_CONFIGURED" });
    await expect(
      services.capture.capture("bathroom", "bathroom_overview"),
    ).rejects.toMatchObject({ code: "SERVICE_NOT_CONFIGURED" });
  });

  it("requires every capture and marks sample evidence and results", async () => {
    const services = createServices("mock");
    await expect(
      services.assessment.analyze({
        profile,
        spaceId: "bathroom",
        captures: [],
      }),
    ).rejects.toMatchObject({ code: "INCOMPLETE_CAPTURE" });
    const captures = await Promise.all(
      ["bathroom_overview", "shower_floor", "toilet_support", "threshold"].map(
        (id) => services.capture.capture("bathroom", id),
      ),
    );
    expect(captures[0]).toMatchObject({
      source: "mock",
      spaceId: "bathroom",
      taskId: "bathroom_overview",
    });
    expect(
      captures.every((item) =>
        existsSync(path.join(process.cwd(), "public", item.uri)),
      ),
    ).toBe(true);
    const result = await services.assessment.analyze({
      profile,
      spaceId: "bathroom",
      captures,
    });
    expect(result).toMatchObject({
      source: "mock",
      spaceId: "bathroom",
      status: "ready",
      safetyValue: "51",
      riskTier: "中",
    });
    expect(result.solutions).toHaveLength(1);
    expect(result.solutions[0]).toMatchObject({
      productId: "anti_slip_coating",
      budgetMin: 80,
      budgetMax: 150,
    });
    expect(
      result.solutions.every((solution) =>
        existsSync(path.join(process.cwd(), "public", solution.image)),
      ),
    ).toBe(true);
  });

  it("does not score missing or conflicting evidence or unsupported spaces", async () => {
    const services = createServices("mock");
    const { spaces, scanTasks } = await import("../data/spaces");
    for (const space of spaces.filter((space) => space.id !== "bathroom")) {
      const captures = await Promise.all(
        scanTasks[space.id].map((task) =>
          services.capture.capture(space.id, task.id),
        ),
      );
      expect(
        captures.every((item) =>
          existsSync(path.join(process.cwd(), "public", item.uri)),
        ),
      ).toBe(true);
      const result = await services.assessment.analyze({
        profile,
        spaceId: space.id,
        captures,
      });
      expect(result.status).toBe("review_required");
      expect(result.safetyValue).toBeNull();
      expect(result.solutions).toEqual([]);
      expect(result.reviewReasons.length).toBeGreaterThan(0);
    }
  });
});
