import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import type { Dispatch, ReactNode } from "react";
import type { AppServices } from "../services/contracts";
import { browserSessionStorage } from "../services/storage";
import { restoreSession, sessionReducer } from "./session";
import type { Action, Session } from "./session";

const Context = createContext<{
  state: Session;
  dispatch: Dispatch<Action>;
  services: AppServices;
  storageWarning: boolean;
} | null>(null);
export function AssessmentProvider({
  services,
  children,
}: {
  services: AppServices;
  children: ReactNode;
}) {
  const storage = useMemo(browserSessionStorage, []);
  const [state, dispatch] = useReducer(sessionReducer, undefined, () =>
    restoreSession(storage.load(), services.mode),
  );
  const [storageWarning, setStorageWarning] = useState(false);
  useEffect(() => {
    const { result: _result, status: _status, error: _error, ...draft } = state;
    setStorageWarning(!storage.save(draft));
  }, [state, storage]);
  useEffect(() => {
    if (state.step !== "analysis" || state.result || state.status === "error")
      return;
    const controller = new AbortController();
    const revision = state.revision;
    dispatch({ type: "started" });
    services.assessment
      .analyze(
        {
          profile: state.profile,
          spaceId: state.spaceId,
          captures: state.captures,
        },
        controller.signal,
      )
      .then((result) => {
        if (!controller.signal.aborted)
          dispatch({ type: "succeeded", revision, result });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          dispatch({
            type: "failed",
            revision,
            message:
              error instanceof Error ? error.message : "分析失败，请重试。",
          });
      });
    return () => controller.abort();
    // Input changes always increment revision; pending status must not cancel its own request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step, state.revision, services]);
  return (
    <Context.Provider value={{ state, dispatch, services, storageWarning }}>
      {children}
    </Context.Provider>
  );
}
export function useAssessment() {
  const value = useContext(Context);
  if (!value) throw new Error("AssessmentProvider is required");
  return value;
}
