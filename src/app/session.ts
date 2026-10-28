import { scanTasks, spaces } from "../data/spaces";
import {
  emptyProfile,
  isProfileComplete,
  sanitizeProfile,
} from "../features/profile/model";
import type {
  AppMode,
  AssessmentResult,
  CaptureRecord,
  Profile,
} from "../services/contracts";
export const steps = [
  "profile",
  "space",
  "capture",
  "analysis",
  "report",
  "plan",
  "confirm",
] as const;
export type Step = (typeof steps)[number];
interface Resume {
  step: Step;
  selectedIds: string[];
  confirmed: boolean;
}
export interface Session {
  step: Step;
  profile: Profile;
  spaceId: string;
  captures: CaptureRecord[];
  result: AssessmentResult | null;
  selectedIds: string[];
  confirmed: boolean;
  status: "idle" | "pending" | "success" | "error";
  error: string | null;
  revision: number;
  resume?: Resume;
}
export const initialSession: Session = {
  step: "profile",
  profile: emptyProfile,
  spaceId: "",
  captures: [],
  result: null,
  selectedIds: [],
  confirmed: false,
  status: "idle",
  error: null,
  revision: 0,
};
export type Action =
  | { type: "profile"; profile: Profile }
  | { type: "selectSpace"; spaceId: string }
  | { type: "capture"; capture: CaptureRecord }
  | { type: "retake"; taskId: string }
  | { type: "navigate"; step: Step }
  | { type: "started" }
  | { type: "succeeded"; revision: number; result: AssessmentResult }
  | { type: "failed"; revision: number; message: string }
  | { type: "toggle"; id: string }
  | { type: "confirm" | "retry" | "reset" };
export function capturesComplete(
  state: Pick<Session, "spaceId" | "captures">,
): boolean {
  const tasks = scanTasks[state.spaceId];
  return Boolean(
    tasks?.length &&
    tasks.every((task) =>
      state.captures.some(
        (item) => item.spaceId === state.spaceId && item.taskId === task.id,
      ),
    ),
  );
}
function invalidate(state: Session): Session {
  return {
    ...state,
    result: null,
    selectedIds: [],
    confirmed: false,
    status: "idle",
    error: null,
    revision: state.revision + 1,
    resume: undefined,
  };
}
export function sessionReducer(state: Session, action: Action): Session {
  switch (action.type) {
    case "reset":
      return { ...initialSession, revision: state.revision + 1 };
    case "profile":
      return {
        ...invalidate(state),
        profile: sanitizeProfile(action.profile),
        step: "profile",
      };
    case "selectSpace":
      return spaces.some((space) => space.id === action.spaceId)
        ? {
            ...invalidate(state),
            spaceId: action.spaceId,
            captures: [],
            step: "space",
          }
        : state;
    case "capture": {
      if (
        action.capture.spaceId !== state.spaceId ||
        !scanTasks[state.spaceId]?.some(
          (task) => task.id === action.capture.taskId,
        )
      )
        return state;
      return {
        ...invalidate(state),
        captures: [
          ...state.captures.filter(
            (item) => item.taskId !== action.capture.taskId,
          ),
          action.capture,
        ],
      };
    }
    case "retake":
      return {
        ...invalidate(state),
        captures: state.captures.filter(
          (item) => item.taskId !== action.taskId,
        ),
        step: "capture",
      };
    case "navigate": {
      if (action.step !== "profile" && !isProfileComplete(state.profile))
        return state;
      if (steps.indexOf(action.step) >= 2 && !state.spaceId) return state;
      if (steps.indexOf(action.step) >= 3 && !capturesComplete(state))
        return state;
      if (steps.indexOf(action.step) >= 4 && !state.result) return state;
      if (action.step === "confirm" && !state.selectedIds.length) return state;
      return { ...state, step: action.step };
    }
    case "started":
      return { ...state, status: "pending", error: null };
    case "succeeded": {
      if (
        action.revision !== state.revision ||
        action.result.spaceId !== state.spaceId ||
        !capturesComplete(state)
      )
        return state;
      const selectedIds = (state.resume?.selectedIds ?? []).filter((id) =>
        action.result.solutions.some((solution) => solution.id === id),
      );
      const resume = state.resume;
      return {
        ...state,
        status: "success",
        result: action.result,
        step:
          resume?.step === "confirm" && !selectedIds.length
            ? "plan"
            : (resume?.step ?? "report"),
        selectedIds,
        confirmed: Boolean(resume?.confirmed && selectedIds.length),
        resume: undefined,
        error: null,
      };
    }
    case "failed":
      return action.revision === state.revision
        ? { ...state, status: "error", error: action.message }
        : state;
    case "retry":
      return { ...invalidate(state), step: "analysis" };
    case "toggle":
      return state.result?.solutions.some(
        (solution) => solution.id === action.id,
      )
        ? {
            ...state,
            selectedIds: state.selectedIds.includes(action.id)
              ? state.selectedIds.filter((id) => id !== action.id)
              : [...state.selectedIds, action.id],
            confirmed: false,
          }
        : state;
    case "confirm":
      return state.selectedIds.length ? { ...state, confirmed: true } : state;
  }
}
export function restoreSession(value: unknown, mode: AppMode): Session {
  if (!value || typeof value !== "object") return { ...initialSession };
  const raw = value as Record<string, unknown>;
  const profile = sanitizeProfile(raw.profile);
  const spaceId = spaces.some((space) => space.id === raw.spaceId)
    ? String(raw.spaceId)
    : "";
  const captures: CaptureRecord[] = [];
  if (Array.isArray(raw.captures))
    for (const item of raw.captures.slice(0, 20)) {
      if (
        item &&
        item.source === mode &&
        item.spaceId === spaceId &&
        scanTasks[spaceId]?.some((task) => task.id === item.taskId) &&
        typeof item.id === "string" &&
        typeof item.uri === "string" &&
        !/^(javascript|data):/i.test(item.uri) &&
        typeof item.capturedAt === "string" &&
        !captures.some((capture) => capture.taskId === item.taskId)
      )
        captures.push(item);
    }
  let state: Session = { ...initialSession, profile, spaceId, captures };
  if (!isProfileComplete(profile)) return state;
  const requested = steps.includes(raw.step as Step)
    ? (raw.step as Step)
    : "profile";
  if (steps.indexOf(requested) >= 3 && capturesComplete(state)) {
    // Re-evaluate evidence; never trust a persisted score.
    const saved =
      requested === "analysis" && raw.resume && typeof raw.resume === "object"
        ? (raw.resume as Record<string, unknown>)
        : raw;
    const resumeStep =
      steps.includes(saved.step as Step) &&
      steps.indexOf(saved.step as Step) >= 4
        ? (saved.step as Step)
        : "report";
    const selectedIds = Array.isArray(saved.selectedIds)
      ? saved.selectedIds
          .filter((id): id is string => typeof id === "string")
          .slice(0, 30)
      : [];
    state = {
      ...state,
      step: "analysis",
      resume: {
        step: resumeStep,
        selectedIds,
        confirmed: saved.confirmed === true,
      },
    };
  } else
    state.step =
      requested === "profile"
        ? "profile"
        : !spaceId || requested === "space"
          ? "space"
          : "capture";
  return state;
}
