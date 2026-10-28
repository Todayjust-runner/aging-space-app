import type { RiskItem } from "../contracts";
/** Narrow bridge to the frozen JavaScript sample model; never a backend contract. */
export interface LegacyAssessment {
  riskTier?: string;
  reasons?: string[];
}
interface LegacySolution {
  solutionId: string;
  actionName: string;
  displayRisk?: { id: string };
  product: { id: string; name: string; imageUrl: string };
  sourceRisk: { name: string };
  budget: { materialMin: number; materialMax: number };
}
export function calculatePatentRiskAssessment(input: {
  spaceId: string;
  profile: object;
}): LegacyAssessment;
export function isFormalPublishedAssessment(value: LegacyAssessment): boolean;
export function buildSafetyDisplayView(value: LegacyAssessment): unknown;
export function formatSafetyDisplayValue(value: unknown): string;
export function buildSolutionRouting(input: {
  assessment: LegacyAssessment;
  risks: RiskItem[];
  products: { id: string; name: string; imageUrl: string }[];
}): {
  demoCandidates: LegacySolution[];
  reviewTasks: { triggerDetail: string }[];
};
