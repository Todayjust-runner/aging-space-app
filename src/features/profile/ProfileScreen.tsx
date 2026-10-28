import { useState } from "react";
import { Screen } from "../../components/Screen";
import { useAssessment } from "../../app/AssessmentContext";
import type { Profile } from "../../services/contracts";
import { isProfileComplete, profileOptions } from "./model";
import "./profile.css";

const labels: Record<keyof typeof profileOptions, string> = {
  living: "居住情况",
  mobility: "行动方式",
  vision: "视力情况",
  balance: "平衡情况",
  fallHistory: "跌倒经历",
  night: "夜间活动",
};
export function ProfileScreen() {
  const { state, dispatch } = useAssessment();
  const [draft, setDraft] = useState(state.profile);
  const update = (key: keyof Profile, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  return (
    <Screen
      eyebrow="了解使用者"
      title="老人情况"
      description="结合日常行动和使用习惯，让空间评估更贴近实际需要。"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          dispatch({ type: "profile", profile: draft });
          dispatch({ type: "navigate", step: "space" });
        }}
      >
        <div className="panel profile-grid">
          <label>
            年龄
            <input
              type="number"
              min="55"
              max="100"
              required
              value={draft.age}
              onChange={(event) => update("age", event.target.value)}
              placeholder="请输入年龄"
            />
          </label>
          {(Object.keys(profileOptions) as (keyof typeof profileOptions)[]).map(
            (key) => (
              <label key={key}>
                {labels[key]}
                <select
                  required
                  value={draft[key]}
                  onChange={(event) => update(key, event.target.value)}
                >
                  <option value="">请选择</option>
                  {profileOptions[key].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            ),
          )}
          <label>
            本空间每日使用次数
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              required
              value={draft.spaceUseFrequency}
              onChange={(event) =>
                update("spaceUseFrequency", event.target.value)
              }
              placeholder="例如 4"
            />
          </label>
          <label className="wide">
            补充说明（选填）
            <textarea
              maxLength={120}
              value={draft.notes}
              onChange={(event) => update("notes", event.target.value)}
              placeholder="例如起身需要借力、夜间路线较长"
            />
          </label>
        </div>
        <p className="hint">请按实际情况填写；未确认的信息不会默认视为安全。</p>
        <div className="actions">
          <button
            className="primary"
            type="submit"
            disabled={!isProfileComplete(draft)}
          >
            选择评估空间
          </button>
        </div>
      </form>
    </Screen>
  );
}
