import type { AppMode, AppServices } from "./contracts";
import { ServiceError } from "./contracts";

export function resolveMode(
  value: string | undefined,
  development: boolean,
): AppMode {
  if (value === "mock" || value === "api") return value;
  return value ? "api" : development ? "mock" : "api";
}
export function createServices(mode: AppMode): AppServices {
  if (mode === "mock")
    return {
      mode,
      assessment: {
        analyze: async (input, signal) =>
          (await import("./mock/services")).analyze(input, signal),
      },
      capture: {
        capture: async (spaceId, taskId) =>
          (await import("./mock/services")).capture(spaceId, taskId),
      },
    };
  const unavailable = async (): Promise<never> => {
    throw new ServiceError(
      "SERVICE_NOT_CONFIGURED",
      "服务未接入。真实采集与评估服务接入后可继续使用。",
    );
  };
  return {
    mode,
    assessment: { analyze: unavailable },
    capture: { capture: unavailable },
  };
}
