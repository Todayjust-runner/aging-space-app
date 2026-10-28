import { scanTasks } from "../../data/spaces";
import type {
  AssessmentInput,
  AssessmentResult,
  CaptureRecord,
} from "../contracts";
import { ServiceError } from "../contracts";
import { riskRules, products } from "./catalog";
import {
  buildSafetyDisplayView,
  buildSolutionRouting,
  calculatePatentRiskAssessment,
  formatSafetyDisplayValue,
  isFormalPublishedAssessment,
} from "./legacyModel";
const previews: Record<string, string> = {
  bathroom: "/assets/spaces/bathroom.png",
  bedroom: "/assets/spaces/bedroom.png",
  corridor: "/assets/spaces/corridor.png",
  kitchen: "/assets/spaces/kitchen.jpg",
  living: "/assets/spaces/living.png",
  balcony: "/assets/spaces/balcony.png",
};
export async function capture(
  spaceId: string,
  taskId: string,
): Promise<CaptureRecord> {
  if (!scanTasks[spaceId]?.some((task) => task.id === taskId))
    throw new ServiceError("INVALID_CAPTURE", "采集视角无效。");
  return {
    id: crypto.randomUUID(),
    spaceId,
    taskId,
    source: "mock",
    uri: previews[spaceId],
    capturedAt: new Date().toISOString(),
  };
}
export async function analyze(
  input: AssessmentInput,
  signal?: AbortSignal,
): Promise<AssessmentResult> {
  const tasks = scanTasks[input.spaceId];
  if (
    !tasks?.length ||
    !tasks.every((task) =>
      input.captures.some(
        (item) =>
          item.taskId === task.id &&
          item.spaceId === input.spaceId &&
          item.source === "mock",
      ),
    )
  ) {
    throw new ServiceError("INCOMPLETE_CAPTURE", "请先完成所有采集视角。");
  }
  signal?.throwIfAborted();
  // Timing belongs to the sample adapter, not the analysis screen.
  await new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, 180);
    signal?.addEventListener("abort", abort, { once: true });
  });
  signal?.throwIfAborted();
  const assessment = calculatePatentRiskAssessment({
    spaceId: input.spaceId,
    profile: input.profile,
  });
  const risks = riskRules.filter((risk) => risk.space === input.spaceId);
  const routing = buildSolutionRouting({ assessment, risks, products });
  const ready = isFormalPublishedAssessment(assessment);
  return {
    id: crypto.randomUUID(),
    source: "mock",
    spaceId: input.spaceId,
    createdAt: new Date().toISOString(),
    status: ready ? "ready" : "review_required",
    riskTier: assessment.riskTier ?? "待复核",
    safetyValue: ready
      ? formatSafetyDisplayValue(buildSafetyDisplayView(assessment))
      : null,
    risks: ready
      ? risks.filter((risk) =>
          routing.demoCandidates.some(
            (solution) => solution.displayRisk?.id === risk.id,
          ),
        )
      : [],
    reviewReasons: [
      ...new Set([
        ...(assessment.reasons ?? []),
        ...routing.reviewTasks.map((task) => task.triggerDetail),
      ]),
    ],
    solutions: routing.demoCandidates.map((solution) => ({
      id: solution.solutionId,
      productId: solution.product.id,
      name: solution.product.name,
      action: solution.actionName,
      image: solution.product.imageUrl,
      reason: solution.sourceRisk.name,
      conditions:
        "样例安装条件已满足；真实地面材质、施工和安装条件仍需现场确认。",
      budgetMin: solution.budget.materialMin,
      budgetMax: solution.budget.materialMax,
    })),
  };
}
