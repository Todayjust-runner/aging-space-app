import { CheckCircle2 } from "lucide-react";
import { useAssessment } from "../../app/AssessmentContext";
import { assetUrl, Screen } from "../../components/Screen";
import "./plan.css";
export function PlanScreen({ confirm = false }: { confirm?: boolean }) {
  const { state, dispatch } = useAssessment();
  const solutions = state.result?.solutions ?? [];
  const visible = confirm
    ? solutions.filter((solution) => state.selectedIds.includes(solution.id))
    : solutions;
  const selected = solutions.filter((solution) =>
    state.selectedIds.includes(solution.id),
  );
  const min = selected.reduce((sum, solution) => sum + solution.budgetMin, 0);
  const max = selected.reduce((sum, solution) => sum + solution.budgetMax, 0);
  return (
    <Screen
      eyebrow="从风险到改造行动"
      title={confirm ? "确认方案" : "改造方案"}
      description="按风险原因选择方案，施工与安装条件仍需现场确认。"
    >
      {!visible.length && (
        <div className="panel empty-state">
          <h2>暂时没有可直接选择的方案</h2>
          <p>先补齐空间证据和必要条件，再进行方案匹配。</p>
        </div>
      )}
      {visible.map((solution) => (
        <article className="panel solution" key={solution.id}>
          <div className="solution-main">
            <img src={assetUrl(solution.image)} alt={solution.name} />
            <div>
              <span className="eyebrow">{solution.action}</span>
              <h2>{solution.name}</h2>
              <p>{solution.reason}</p>
              <strong className="price">
                ¥{solution.budgetMin}–{solution.budgetMax}
              </strong>
              <small>样例材料预算 · 模拟估价 / 非报价</small>
            </div>
          </div>
          <p className="conditions">{solution.conditions}</p>
          {!confirm && (
            <label className="select-solution">
              <input
                type="checkbox"
                checked={state.selectedIds.includes(solution.id)}
                onChange={() => dispatch({ type: "toggle", id: solution.id })}
              />
              加入当前清单：{solution.name}
            </label>
          )}
        </article>
      ))}
      {selected.length > 0 && (
        <div className="budget-summary">
          <span>已选 {selected.length} 项 · 样例材料预算</span>
          <strong>
            ¥{min}–{max}
          </strong>
        </div>
      )}
      {state.confirmed && confirm && (
        <div className="notice success" role="status">
          <CheckCircle2 size={20} aria-hidden="true" />
          <div>
            <strong>清单已保存在本机</strong>
            <p>尚未提交服务预约或订单，改造完成后需重新采集验证。</p>
          </div>
        </div>
      )}
      <div className="actions">
        <button
          className="secondary"
          onClick={() =>
            dispatch({ type: "navigate", step: confirm ? "plan" : "report" })
          }
        >
          {confirm ? "调整方案" : "返回报告"}
        </button>
        {confirm ? (
          <button
            className="primary"
            disabled={!selected.length || state.confirmed}
            onClick={() => dispatch({ type: "confirm" })}
          >
            {state.confirmed ? "已确认" : "确认当前清单"}
          </button>
        ) : (
          <button
            className="primary"
            disabled={!selected.length}
            onClick={() => dispatch({ type: "navigate", step: "confirm" })}
          >
            预览方案
          </button>
        )}
      </div>
    </Screen>
  );
}
