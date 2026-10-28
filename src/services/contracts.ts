export type AppMode = "mock" | "api";
export interface Profile {
  age: string;
  living: string;
  mobility: string;
  vision: string;
  grip: string;
  assistance: string;
  balance: string;
  fallHistory: string;
  night: string;
  spaceUseFrequency: string;
  focus: string;
  notes: string;
}
export interface Space {
  id: string;
  name: string;
  scene: string;
  description: string;
  registryStatus?: string;
  time?: string;
  riskCount?: number;
}
export interface ScanTask {
  id: string;
  title: string;
  tip: string;
  target: string;
}
export interface CaptureRecord {
  id: string;
  taskId: string;
  spaceId: string;
  source: AppMode;
  uri: string;
  capturedAt: string;
}
export interface RiskItem {
  id: string;
  name: string;
  level: string;
  evidence: string[];
  action: string;
}
export interface Solution {
  id: string;
  productId: string;
  name: string;
  action: string;
  image: string;
  reason: string;
  conditions: string;
  budgetMin: number;
  budgetMax: number;
}
export interface AssessmentInput {
  profile: Profile;
  spaceId: string;
  captures: CaptureRecord[];
}
export interface AssessmentResult {
  id: string;
  source: AppMode;
  spaceId: string;
  createdAt: string;
  status: "ready" | "review_required";
  riskTier: string;
  safetyValue: string | null;
  risks: RiskItem[];
  reviewReasons: string[];
  solutions: Solution[];
}
export interface AssessmentService {
  analyze(
    input: AssessmentInput,
    signal?: AbortSignal,
  ): Promise<AssessmentResult>;
}
export interface CaptureService {
  capture(spaceId: string, taskId: string): Promise<CaptureRecord>;
}
export interface AppServices {
  mode: AppMode;
  assessment: AssessmentService;
  capture: CaptureService;
}
export class ServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}
