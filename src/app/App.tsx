import { ArrowLeft, House, RotateCcw } from "lucide-react";
import { AssessmentProvider, useAssessment } from "./AssessmentContext";
import { createServices, resolveMode } from "../services";
import type { AppServices } from "../services/contracts";
import { ProfileScreen } from "../features/profile/ProfileScreen";
import { SpaceScreen } from "../features/capture/SpaceScreen";
import { CaptureScreen } from "../features/capture/CaptureScreen";
import { AnalysisScreen } from "../features/report/AnalysisScreen";
import { ReportScreen } from "../features/report/ReportScreen";
import { PlanScreen } from "../features/plan/PlanScreen";
import { steps } from "./session";
import "../styles/base.css";
import "./app.css";

const defaults = createServices(
  resolveMode(import.meta.env.VITE_APP_MODE, import.meta.env.DEV),
);
function AppContent() {
  const { state, dispatch, services, storageWarning } = useAssessment();
  const index = steps.indexOf(state.step);
  const phase = index < 2 ? 0 : index === 2 ? 1 : index === 3 ? 2 : 3;
  const previous = index === 4 ? "capture" : steps[Math.max(0, index - 1)];
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">
            <House size={23} aria-hidden="true" />
          </span>
          <div>
            <strong>智绘适老</strong>
            <small>居家空间安全评估</small>
          </div>
        </div>
        <button
          className="text-button"
          onClick={() => dispatch({ type: "reset" })}
        >
          <RotateCcw size={15} aria-hidden="true" />
          重新开始
        </button>
      </header>
      <main className="app-main">
        <div className={`mode-notice ${services.mode}`}>
          {services.mode === "mock"
            ? "开发样例模式 · 图片与评估结果仅供流程验证"
            : "真实服务模式 · 采集与评估服务未接入"}
        </div>
        {storageWarning && (
          <p className="notice error" role="status">
            本机存储不可用，关闭页面后进度可能丢失。
          </p>
        )}
        <nav className="workflow" aria-label="评估进度">
          <ol>
            {["准备", "采集", "分析", "结果"].map((label, item) => (
              <li
                key={label}
                aria-current={phase === item ? "step" : undefined}
                className={item <= phase ? "active" : ""}
              >
                <span>{item + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        </nav>
        {index > 0 && (
          <button
            className="back-button"
            onClick={() => dispatch({ type: "navigate", step: previous })}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            返回上一步
          </button>
        )}
        {state.step === "profile" && <ProfileScreen />}
        {state.step === "space" && <SpaceScreen />}
        {state.step === "capture" && <CaptureScreen />}
        {state.step === "analysis" && <AnalysisScreen />}
        {state.step === "report" && state.result && <ReportScreen />}
        {state.step === "plan" && state.result && <PlanScreen />}
        {state.step === "confirm" && state.result && <PlanScreen confirm />}
      </main>
      <footer className="app-footer">让每一次起身与行走，多一份安心。</footer>
    </div>
  );
}
export default function App({
  services = defaults,
}: {
  services?: AppServices;
}) {
  return (
    <AssessmentProvider services={services}>
      <AppContent />
    </AssessmentProvider>
  );
}
