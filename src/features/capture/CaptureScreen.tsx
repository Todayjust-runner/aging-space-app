import { useState } from "react";
import { Camera, Check, RotateCcw } from "lucide-react";
import { useAssessment } from "../../app/AssessmentContext";
import { capturesComplete } from "../../app/session";
import { scanTasks, spaces } from "../../data/spaces";
import { assetUrl, Screen } from "../../components/Screen";
import "./capture.css";
export function CaptureScreen() {
  const { state, dispatch, services } = useAssessment();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tasks = scanTasks[state.spaceId];
  const current = tasks.find(
    (task) => !state.captures.some((item) => item.taskId === task.id),
  );
  const latest = state.captures.at(-1);
  async function record() {
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      dispatch({
        type: "capture",
        capture: await services.capture.capture(state.spaceId, current.id),
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "采集失败，请重试。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      eyebrow={`已完成 ${state.captures.length} / ${tasks.length} 个视角`}
      title={`${spaces.find((space) => space.id === state.spaceId)?.name}引导采集`}
      description="整体空间与局部细节互相补充。完成所有视角后，再统一分析。"
    >
      <div className="capture-preview">
        {latest ? (
          <img src={assetUrl(latest.uri)} alt="已记录的空间样例" />
        ) : (
          <div className="capture-placeholder">
            <Camera size={40} aria-hidden="true" />
            <span>按下方提示完成采集</span>
          </div>
        )}
        <span className="preview-badge">
          {services.mode === "mock" ? "内置样例图片" : "采集画面"}
        </span>
      </div>
      {current ? (
        <div className="panel current-task">
          <span className="eyebrow">当前视角</span>
          <h2>{current.title}</h2>
          <p>{current.tip}</p>
          <button className="primary" disabled={busy} onClick={record}>
            {services.mode === "mock" ? "记录当前样例视角" : "采集当前视角"}
          </button>
        </div>
      ) : (
        <p className="notice success">
          <Check size={18} aria-hidden="true" />
          全部视角已就绪，可以开始分析。
        </p>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <ol className="capture-list">
        {tasks.map((task, index) => {
          const done = state.captures.some((item) => item.taskId === task.id);
          return (
            <li key={task.id}>
              <span className={`task-index ${done ? "done" : ""}`}>
                {done ? <Check size={16} aria-hidden="true" /> : index + 1}
              </span>
              <div>
                <strong>{task.title}</strong>
                <p>{task.target}</p>
              </div>
              {done && (
                <button
                  className="text-button"
                  aria-label={`重拍：${task.title}`}
                  onClick={() => {
                    setError(null);
                    dispatch({ type: "retake", taskId: task.id });
                  }}
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  重拍
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <div className="actions">
        <button
          className="primary"
          disabled={!capturesComplete(state) || busy}
          onClick={() => dispatch({ type: "navigate", step: "analysis" })}
        >
          开始分析
        </button>
      </div>
    </Screen>
  );
}
