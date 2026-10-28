import {
  ArrowUpRight,
  Bath,
  BedDouble,
  CookingPot,
  DoorOpen,
  Sofa,
  Sun,
} from "lucide-react";
import { spaces } from "../../data/spaces";
import { Screen } from "../../components/Screen";
import { useAssessment } from "../../app/AssessmentContext";
import "./capture.css";
const icons = [Bath, BedDouble, DoorOpen, CookingPot, Sofa, Sun];
export function SpaceScreen() {
  const { state, dispatch } = useAssessment();
  return (
    <Screen
      eyebrow="确定评估范围"
      title="选择一个空间"
      description="一次关注一个空间，按提示补齐关键视角。更换空间会清除当前采集记录。"
    >
      <div className="space-grid">
        {spaces.map((space, index) => {
          const Icon = icons[index];
          return (
            <button
              className={`space-option ${state.spaceId === space.id ? "selected" : ""}`}
              key={space.id}
              aria-pressed={state.spaceId === space.id}
              onClick={() =>
                dispatch({ type: "selectSpace", spaceId: space.id })
              }
            >
              <Icon size={26} aria-hidden="true" />
              <strong>{space.name}</strong>
              <span>{space.scene}</span>
              <ArrowUpRight
                className="option-arrow"
                size={16}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
      <div className="actions">
        <button
          className="primary"
          disabled={!state.spaceId}
          onClick={() => dispatch({ type: "navigate", step: "capture" })}
        >
          进入引导采集
        </button>
      </div>
    </Screen>
  );
}
