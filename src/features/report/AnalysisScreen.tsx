import { LoaderCircle, ScanLine } from "lucide-react";
import { Screen } from "../../components/Screen";
import { useAssessment } from "../../app/AssessmentContext";
import "./report.css";
export function AnalysisScreen() {
  const { state, dispatch } = useAssessment();
  return (
    <Screen
      eyebrow="整理空间证据"
      title={state.status === "error" ? "分析未完成" : "正在分析"}
      description="结合采集记录与老人情况整理评估结果，请稍候。"
    >
      <div className="panel analysis-state">
        {state.status === "error" ? (
          <>
            <ScanLine size={40} aria-hidden="true" />
            <p role="alert" className="notice error">
              {state.error}
            </p>
            <button
              className="primary"
              onClick={() => dispatch({ type: "retry" })}
            >
              重试分析
            </button>
          </>
        ) : (
          <>
            <LoaderCircle className="spinner" size={40} aria-hidden="true" />
            <p role="status">正在处理本次评估…</p>
            <p className="hint">结果准备好后将自动显示。</p>
          </>
        )}
      </div>
      <div className="actions">
        <button
          className="secondary"
          onClick={() => dispatch({ type: "navigate", step: "capture" })}
        >
          返回采集
        </button>
      </div>
    </Screen>
  );
}
