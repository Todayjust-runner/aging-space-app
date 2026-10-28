import { ArrowRight, ShieldCheck } from "lucide-react";
import { useAssessment } from "../../app/AssessmentContext";
import { Screen } from "../../components/Screen";
import { spaces } from "../../data/spaces";
import "./report.css";
export function ReportScreen() {
  const { state, dispatch } = useAssessment();
  const result = state.result!;
  return (
    <Screen
      eyebrow={
        result.source === "mock" ? "样例报告 · 仅供流程验证" : "本次评估"
      }
      title={`${spaces.find((space) => space.id === state.spaceId)?.name}评估报告`}
      description="查看当前证据支持的结论，缺失或冲突的信息需补充确认。"
    >
      <div
        className={`panel score-card ${result.status === "review_required" ? "review" : ""}`}
      >
        <div>
          <ShieldCheck size={24} aria-hidden="true" />
          <p>当前风险等级</p>
          <h2>
            {result.status === "review_required"
              ? "待复核"
              : `${result.riskTier}风险`}
          </h2>
        </div>
        {result.safetyValue !== null ? (
          <div className="score" aria-label="当前安全分">
            <strong>{result.safetyValue}</strong>
            <span>安全分 / 100</span>
          </div>
        ) : (
          <span className="review-label">暂不显示安全数值</span>
        )}
      </div>
      {result.risks.map((risk) => (
        <article className="panel risk-item" key={risk.id}>
          <span className="eyebrow">{risk.level}风险 · 样例证据</span>
          <h2>{risk.name}</h2>
          <ul>
            {risk.evidence.map((evidence) => (
              <li key={evidence}>{evidence}</li>
            ))}
          </ul>
          <div className="risk-advice">
            <strong>改造方向</strong>
            <p>{risk.action}</p>
          </div>
        </article>
      ))}
      {result.reviewReasons.length > 0 && (
        <div className="panel review-details">
          <h2>需要补充确认</h2>
          <ul>
            {result.reviewReasons.map((reason) => (
              <li key={reason}>
                {reason.replace("已转交专业人员复核", "需由专业人员复核")}
              </li>
            ))}
          </ul>
          <p className="hint">当前仅展示待复核说明，尚未提交复核工单。</p>
        </div>
      )}
      <p className="hint">
        安全分越高表示当前评估越安全。实际改造效果需通过同一空间的复扫确认。
      </p>
      <div className="actions">
        <button
          className="secondary"
          onClick={() => dispatch({ type: "navigate", step: "capture" })}
        >
          补充或重拍
        </button>
        <button
          className="primary"
          onClick={() => dispatch({ type: "navigate", step: "plan" })}
        >
          选择改造方案
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
    </Screen>
  );
}
