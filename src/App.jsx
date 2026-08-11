import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  ClipboardList,
  Bookmark,
  Cpu,
  Heart,
  Home,
  Layers3,
  MessageCircle,
  MessageSquare,
  Edit3,
  Minus,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  Accessibility,
  Footprints,
  Grip,
  Headset,
  Lightbulb,
  ImagePlus,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  communityPosts,
  communityTopics,
  coreEntrances,
  mallCategories,
  productCategoryMap,
  products,
  riskRules,
  sampleCases,
  scanTasks,
  spaces
} from "./demoData.js";
import {
  buildHumanFactorAssessment,
  buildPlanSafetyProjection,
  buildPostReviewSafetyProjection,
  buildReport,
  buildSolutionRouting,
  canConfirmPlan,
  calculatePatentRiskAssessment,
  commitProfileDraft,
  createCommunityPost,
  getCaseBySpace,
  getRecommendedRisksForProduct,
  getRisksBySpace,
  getSpaceById,
  isProfileComplete,
  isCommunityPostDraftValid,
  inputLimits,
  loadSessionState,
  prioritizeRisksForProfile,
  selectInitialPlanProducts,
  resolvePublicAssetUrl,
  sanitizeSessionState,
  saveSessionState
} from "./logic.js";

const assetUrl = (path) => resolvePublicAssetUrl(path, import.meta.env.BASE_URL);
const demoStorageKey = "zhihui-aging-demo:v7";

const scanSteps = [
  { key: "home", label: "入口", icon: Home },
  { key: "space", label: "空间", icon: Layers3 },
  { key: "scan", label: "采集", icon: Camera },
  { key: "analysis", label: "分析", icon: Cpu },
  { key: "report", label: "评估", icon: BarChart3 },
  { key: "match", label: "匹配", icon: ClipboardList },
  { key: "preview", label: "预览", icon: CheckCircle2 }
];

const entranceIcons = {
  scan: Camera,
  mall: Store,
  community: MessageCircle
};

const bottomNavOrder = ["mall", "scan", "community"];

const categoryIcon = {
  all: Sparkles,
  support: Grip,
  "anti-slip": Footprints,
  lighting: Lightbulb,
  "barrier-free": Accessibility,
  service: Headset
};

const scanPreviewImages = {
  bathroom: "/assets/spaces/bathroom-accessible-warm.jpg",
  bedroom: "/assets/spaces/bedroom.png",
  corridor: "/assets/spaces/corridor-warm.jpg",
  kitchen: "/assets/spaces/kitchen.png",
  living: "/assets/spaces/living.png",
  balcony: "/assets/spaces/balcony.png"
};

const defaultElderProfile = {
  age: "75",
  living: "独居",
  mobility: "使用手杖",
  vision: "弱光下视物困难",
  grip: "起身需要借力",
  assistance: "部分动作需辅助",
  balance: "平衡能力受限",
  fallHistory: "有跌倒经历",
  night: "起夜频繁",
  spaceUseFrequency: "4 次/日",
  focus: "卫生间防跌倒",
  notes: "夜间起身较慢"
};

const spaceResultLabels = {
  bathroom: "可生成完整评估",
  bedroom: "需补充夜间证据",
  corridor: "需核对通道测量",
  kitchen: "需专业复核",
  living: "需专业复核",
  balcony: "需专业复核"
};

function loadSavedSessionState() {
  if (typeof window === "undefined") return {};
  return sanitizeSessionState(loadSessionState(window.localStorage, demoStorageKey), {
    entranceIds: coreEntrances.map((entry) => entry.id),
    spaceIds: spaces.map((space) => space.id),
    topicIds: communityTopics.map((topic) => topic.id).filter((id) => id !== "all"),
    productIds: products.map((product) => product.id),
    taskIdsBySpace: Object.fromEntries(
      Object.entries(scanTasks).map(([id, tasks]) => [id, tasks.map((task) => task.id)])
    )
  });
}

function getProfileInsight(profile, space) {
  const hasProfileData = [profile.age, profile.living, profile.mobility, profile.vision, profile.grip, profile.assistance, profile.night]
    .some((value) => value && value !== "待确认");
  if (!hasProfileData) return [];

  const tips = [];

  if (profile.living.includes("独居") || profile.living.includes("独处")) {
    tips.push("独居或白天独处时，跌倒后的发现和求助更慢，建议优先处理高频动线。");
  }
  if (profile.night.includes("起夜")) {
    tips.push("夜间起夜会放大湿区、门槛和暗区风险，需要重点确认照明和通行连续性。");
  }
  if (profile.mobility.includes("起身") || profile.notes.includes("膝")) {
    tips.push("起身较慢或膝关节不适时，坐便区、床边和淋浴区的支撑点优先级更高。");
  }
  if (profile.mobility.includes("助行器") || profile.mobility.includes("轮椅")) {
    tips.push("使用辅具时，需要额外核查门槛高差、通道宽度和转弯空间。");
  }
  if (/视物|视力/.test(profile.vision)) {
    tips.push("视物困难会放大暗区、反光地面和门槛高差的识别难度。");
  }
  if (/不足|较弱|需借力/.test(profile.grip)) {
    tips.push("抓握或支撑能力不足时，应提高扶手连续性和稳定借力点的优先级。");
  }
  if (/陪同|辅助/.test(profile.assistance)) {
    tips.push("需要他人辅助时，还需复核照护者站位和双人通行空间。");
  }
  if (space.id === "bathroom") {
    tips.push("本次评估空间为卫生间，湿区防滑、坐便支撑和门槛高差是首要检查项。");
  }

  return tips.slice(0, 3);
}

function App() {
  const [initialSessionState] = useState(loadSavedSessionState);
  const [activeEntrance, setActiveEntrance] = useState(initialSessionState.activeEntrance ?? "scan");
  const [step, setStep] = useState(initialSessionState.step ?? 0);
  const [spaceId, setSpaceId] = useState(initialSessionState.spaceId ?? "");
  const [completedTasks, setCompletedTasks] = useState(initialSessionState.completedTasks ?? []);
  const [elderProfile, setElderProfile] = useState({
    ...defaultElderProfile,
    ...(initialSessionState.elderProfile ?? {})
  });
  const [planItemIds, setPlanItemIds] = useState(initialSessionState.planItemIds ?? []);
  const [planConfirmed, setPlanConfirmed] = useState(initialSessionState.planConfirmed ?? false);
  const [communityFeed, setCommunityFeed] = useState([
    ...(initialSessionState.communityUserPosts ?? []),
    ...communityPosts
  ]);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(initialSessionState.maxUnlockedStep ?? 0);

  const currentSpace = getSpaceById(spaces, spaceId);
  const activeSpaceId = currentSpace?.id ?? "";
  const tasks = activeSpaceId ? scanTasks[activeSpaceId] : [];
  const baseRisks = useMemo(() => getRisksBySpace(riskRules, activeSpaceId), [activeSpaceId]);
  const risks = useMemo(
    () => prioritizeRisksForProfile(baseRisks, elderProfile),
    [baseRisks, elderProfile]
  );
  const assessment = useMemo(
    () => calculatePatentRiskAssessment({ spaceId: activeSpaceId, profile: elderProfile }),
    [activeSpaceId, elderProfile]
  );
  const solutionRouting = useMemo(
    () => buildSolutionRouting({ assessment, risks, products }),
    [assessment, risks]
  );
  const matchedProducts = useMemo(
    () => solutionRouting.demoCandidates.map((solution) => solution.product),
    [solutionRouting]
  );
  const report = useMemo(
    () => currentSpace ? buildReport({
      space: currentSpace,
      risks,
      products: matchedProducts,
      assessment,
      solutionRouting
    }) : null,
    [assessment, currentSpace, matchedProducts, risks, solutionRouting]
  );
  const sampleCase = getCaseBySpace(sampleCases, spaceId);
  const hasAssessment = Boolean(currentSpace && maxUnlockedStep >= 4);

  useEffect(() => {
    saveSessionState(window.localStorage, demoStorageKey, {
      activeEntrance,
      step,
      spaceId,
      completedTasks,
      elderProfile,
      planItemIds,
      planConfirmed,
      communityUserPosts: communityFeed
        .filter((post) => post.id.startsWith("post_local_"))
        .slice(0, 4),
      maxUnlockedStep
    });
  }, [
    activeEntrance,
    communityFeed,
    completedTasks,
    elderProfile,
    maxUnlockedStep,
    planConfirmed,
    planItemIds,
    spaceId,
    step
  ]);

  const updatePlanItemIds = (updater) => {
    setPlanConfirmed(false);
    setPlanItemIds(updater);
  };

  const restartAssessment = () => {
    window.localStorage.removeItem(demoStorageKey);
    setActiveEntrance("scan");
    setStep(0);
    setSpaceId("");
    setCompletedTasks([]);
    setElderProfile(defaultElderProfile);
    setPlanItemIds([]);
    setPlanConfirmed(false);
    setMaxUnlockedStep(0);
  };

  const resetForSpace = (nextSpaceId) => {
    setSpaceId(nextSpaceId);
    setCompletedTasks([]);
    setPlanItemIds([]);
    setPlanConfirmed(false);
    setMaxUnlockedStep(2);
  };

  const moveToStep = (nextStep) => {
    const boundedStep = Math.min(scanSteps.length - 1, Math.max(0, nextStep));
    setMaxUnlockedStep((current) => Math.max(current, boundedStep));
    setStep(boundedStep);
  };
  const goToUnlockedStep = (nextStep) => {
    setStep(Math.min(nextStep, maxUnlockedStep));
  };
  const goNext = () => {
    setStep((value) => {
      const nextStep = Math.min(scanSteps.length - 1, value + 1);
      setMaxUnlockedStep((current) => Math.max(current, nextStep));
      return nextStep;
    });
  };
  const goBack = () => {
    if (activeEntrance !== "scan") {
      setActiveEntrance("scan");
      return;
    }
    setStep((value) => Math.max(0, value - 1));
  };
  const switchEntrance = (entranceId) => {
    if (entranceId === "scan") {
      setActiveEntrance("scan");
      return;
    }

    setActiveEntrance(entranceId);
  };
  const completeAnalysis = () => {
    setPlanItemIds(selectInitialPlanProducts(matchedProducts, risks, 3).map((product) => product.id));
    setPlanConfirmed(false);
    goNext();
  };
  const canGoBack = activeEntrance !== "scan" || step > 0;

  const screenProps = {
    currentSpace,
    assessment,
    solutionRouting,
    tasks,
    risks,
    matchedProducts,
    report,
    sampleCase,
    hasAssessment,
    completedTasks,
    setCompletedTasks,
    elderProfile,
    setElderProfile,
    planItemIds,
    setPlanItemIds: updatePlanItemIds,
    planConfirmed,
    setPlanConfirmed,
    communityFeed,
    setCommunityFeed,
    selectedSpaceId: spaceId,
    resetForSpace,
    restartAssessment,
    completeAnalysis,
    goNext,
    setStep: moveToStep,
    setActiveEntrance
  };

  return (
    <main className="app-shell">
      <section className="stage">
        <PhoneFrame canGoBack={canGoBack} activeEntrance={activeEntrance} goBack={goBack}>
          {activeEntrance === "scan" && <ProgressRail step={step} maxUnlockedStep={maxUnlockedStep} onStepSelect={goToUnlockedStep} />}
          {activeEntrance === "scan" && step === 0 && <HomeScreen {...screenProps} />}
          {activeEntrance === "scan" && step === 1 && <SpaceScreen {...screenProps} />}
          {activeEntrance === "scan" && step === 2 && <ScanScreen {...screenProps} />}
          {activeEntrance === "scan" && step === 3 && <AnalysisScreen {...screenProps} />}
          {activeEntrance === "scan" && step === 4 && <ReportScreen {...screenProps} />}
          {activeEntrance === "scan" && step === 5 && <MatchScreen {...screenProps} />}
          {activeEntrance === "scan" && step === 6 && <PlanPreviewScreen {...screenProps} />}
          {activeEntrance === "mall" && <MallScreen {...screenProps} />}
          {activeEntrance === "community" && <CommunityScreen {...screenProps} />}
          <BottomNav activeEntrance={activeEntrance} switchEntrance={switchEntrance} />
        </PhoneFrame>

        <aside className="evidence-panel" aria-label="产品评估体系">
          <div className="panel-kicker">产品评估体系</div>
          <h1>智绘适老</h1>
          <p>
            扫描形成安全评估，商城按风险项匹配方案，社区承载用户分享、提问和服务评价。
          </p>
          <div className="architecture">
            {["拍照采集", "智能分析", "生成报告", "匹配方案", "预览效果", "社区反馈"].map((item, index) => (
              <div className="architecture-node" key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item}
              </div>
            ))}
          </div>
          <div className="proof-strip">
            <Metric
              value={report?.formalInput ? report.safetyValue : (report ? "待复核" : "--")}
              label={report?.formalInput ? "安全分" : "评估状态"}
            />
            <Metric value={`${risks.length}项`} label="风险点" />
            <Metric value={`${solutionRouting.demoCandidates.length}个`} label="匹配方案" />
          </div>
          <div className="note-box">
            <ShieldCheck size={18} />
            <span>涉及承重、施工和高差处理的内容保留人工复核，避免把系统建议误解为替代专业判断。</span>
          </div>
        </aside>
      </section>
    </main>
  );
}

function PhoneFrame({ activeEntrance, canGoBack, children, goBack }) {
  const activeMeta = coreEntrances.find((entry) => entry.id === activeEntrance) ?? coreEntrances[0];

  return (
    <div className="iphone-device">
      <span className="device-antenna device-antenna-left-top" aria-hidden="true" />
      <span className="device-antenna device-antenna-left-bottom" aria-hidden="true" />
      <span className="device-antenna device-antenna-right-top" aria-hidden="true" />
      <span className="device-antenna device-antenna-right-bottom" aria-hidden="true" />
      <span className="device-button device-button-action" aria-hidden="true" />
      <span className="device-button device-button-volume-up" aria-hidden="true" />
      <span className="device-button device-button-volume-down" aria-hidden="true" />
      <span className="device-button device-button-power" aria-hidden="true" />
      <section className="phone-frame" aria-label="智绘适老手机端">
        <div className="device-island" aria-hidden="true" />
        <IosStatusBar />
        {activeEntrance !== "mall" && (
          <header className="phone-header">
            {canGoBack ? (
              <button className="icon-button" onClick={goBack} aria-label="返回">
                <ArrowLeft size={18} />
              </button>
            ) : <span className="header-spacer" aria-hidden="true" />}
            <div>
              <strong>智绘适老</strong>
              <span>{activeMeta.label}</span>
            </div>
            <span className="icon-button" aria-hidden="true" style={{ visibility: "hidden" }} />
          </header>
        )}
        {children}
        <div className="device-home" aria-hidden="true" />
      </section>
    </div>
  );
}

function IosStatusBar() {
  return (
    <div className="phone-status" aria-hidden="true">
      <span className="ios-time">9:41</span>
      <span />
      <svg className="ios-system-status" viewBox="0 0 78 14" focusable="false">
        <g className="ios-cellular-bars">
          <rect x="0" y="9" width="3.4" height="5" rx="1.25" />
          <rect x="5.15" y="6.1" width="3.4" height="7.9" rx="1.25" />
          <rect x="10.3" y="3.15" width="3.4" height="10.85" rx="1.25" />
          <rect x="15.45" y="0.15" width="3.4" height="13.85" rx="1.25" />
        </g>
        <g className="ios-wifi-glyph">
          <path d="M23.9 4.35C29.45-.72 38.55-.72 44.1 4.35l-2.55 2.5c-4.15-3.72-10.95-3.72-15.1 0Z" />
          <path d="M28.05 8.45c3.28-3 8.62-3 11.9 0l-2.58 2.52c-1.85-1.6-4.89-1.6-6.74 0Z" />
          <path d="M31.75 12.18a3.18 3.18 0 0 1 4.5 0L34 14Z" />
        </g>
        <g className="ios-battery-glyph">
          <rect x="49.5" y="1" width="24.5" height="12" rx="3.8" />
          <path d="M75.25 4.25v5.5A2.9 2.9 0 0 0 77.5 7a2.9 2.9 0 0 0-2.25-2.75Z" />
        </g>
      </svg>
    </div>
  );
}

function ProgressRail({ step, maxUnlockedStep, onStepSelect }) {
  const phases = [
    { label: "准备", start: 0, end: 1 },
    { label: "采集", start: 2, end: 2 },
    { label: "分析", start: 3, end: 3 },
    { label: "结果", start: 4, end: 6 }
  ];
  const activePhase = phases.findIndex((phase) => step >= phase.start && step <= phase.end);

  return (
    <nav className="progress-rail" aria-label="评估流程">
      <div className="progress-context">
        <span>{phases[activePhase].label}</span>
        <strong>{activePhase + 1}/{phases.length}</strong>
      </div>
      <div className="progress-track">
        {phases.map((phase, index) => {
          const locked = phase.start > maxUnlockedStep;
          return (
            <button
              key={phase.label}
              className={index === activePhase ? "active" : index < activePhase ? "done" : ""}
              aria-label={locked ? `${phase.label}未解锁` : `切换到${phase.label}`}
              title={locked ? `${phase.label}未解锁` : phase.label}
              disabled={locked}
              onClick={() => onStepSelect(Math.min(phase.end, maxUnlockedStep))}
            >
              <span aria-hidden="true" />
              <small>{phase.label}</small>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function BottomNav({ activeEntrance, switchEntrance }) {
  const navEntries = bottomNavOrder.map((id) => coreEntrances.find((entry) => entry.id === id)).filter(Boolean);

  return (
    <nav className="bottom-nav" aria-label="核心功能入口">
      {navEntries.map((entry) => {
        const Icon = entranceIcons[entry.id];
        return (
          <button
            className={`${activeEntrance === entry.id ? "active" : ""} ${entry.id === "scan" ? "center-action" : ""}`}
            key={entry.id}
            onClick={() => switchEntrance(entry.id)}
          >
            <Icon size={19} />
            <span>{entry.shortLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}

function HomeScreen({ setStep }) {
  return (
    <section className="screen scan-home-screen">
      <div className="scan-home-hero">
        <div className="scan-home-copy">
          <span className="eyebrow"><ShieldCheck size={15} /> 居家安全扫描</span>
          <h2>
            拍完关键视角，<br />再统一智能分析
          </h2>
          <p>先选择空间，按引导完成采集；<span className="no-break">分析结束后</span>生成风险报告和改造清单。</p>
        </div>
        <button className="scan-launch-button" onClick={() => setStep(1)} aria-label="开始扫描评估">
          <span className="scan-launch-ring">
            <Camera size={34} />
          </span>
          <strong>开始评估</strong>
          <span>先选择评估空间</span>
        </button>
      </div>

      <div className="scan-home-overview" aria-label="扫描评估概览">
        <Layers3 size={18} />
        <div><strong>{spaces.length} 类家庭空间</strong><span>单空间约 4-6 分钟</span></div>
        <ArrowRight size={17} />
      </div>
      <ol className="product-loop-strip" aria-label="核心功能闭环">
        {["识别判断", "方案转化", "效果验证"].map((label, index) => (
          <li key={label}>
            <span>{index + 1}</span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SpaceScreen({
  currentSpace,
  selectedSpaceId,
  elderProfile,
  setElderProfile,
  resetForSpace,
  restartAssessment,
  goNext
}) {
  const hasSelectedSpace = Boolean(selectedSpaceId);
  const profileReady = isProfileComplete(elderProfile);
  const canStartCapture = hasSelectedSpace && profileReady;

  return (
    <section className="screen">
      <SectionTitle eyebrow="本次评估" title="确认对象与空间" text="老人情况调整提示顺序，空间选择决定采集视角和评估准则。" />
      <ProfilePanel profile={elderProfile} setProfile={setElderProfile} />
      <div className="space-selector-head">
        <div>
          <strong>选择评估空间</strong>
          <span>{hasSelectedSpace ? `当前：${currentSpace.name}` : "请选择一个空间"}</span>
        </div>
        <small>{spaces.length} 类可选</small>
      </div>
      <div className="space-grid">
        {spaces.map((space) => (
          <button
            className={`space-card space-card-${space.id} ${space.id === selectedSpaceId ? "selected" : ""}`}
            key={space.id}
            onClick={() => resetForSpace(space.id)}
            style={{ "--image": `url(${assetUrl(scanPreviewImages[space.id])})` }}
          >
            <span className="space-card-media">
              <img src={assetUrl(scanPreviewImages[space.id])} alt={`${space.name}空间示例`} loading="lazy" />
            </span>
            <span className={`registry-badge ${space.registryStatus}`}>
              {spaceResultLabels[space.id]}
            </span>
            <span className="space-scene">{space.scene}</span>
            <strong>{space.name}</strong>
            <div>
              <span>{space.riskCount} 类高频风险</span>
              <span>{space.time}</span>
            </div>
          </button>
        ))}
      </div>
      <button className="primary-button full" onClick={goNext} disabled={!canStartCapture}>
        {!hasSelectedSpace
          ? "选择空间后进入采集"
          : profileReady
            ? "进入引导采集"
            : "请先确认老人情况"}
        <Camera size={18} />
      </button>
      <button className="text-action restart-assessment" type="button" onClick={restartAssessment}>
        <RotateCcw size={15} />
        重新开始评估
      </button>
    </section>
  );
}

function ScanScreen({
  currentSpace,
  tasks,
  completedTasks,
  setCompletedTasks,
  goNext
}) {
  const completeTask = (taskId) => {
    setCompletedTasks((current) => {
      if (current.includes(taskId)) return current;

      const next = [...current, taskId];
      if (next.length >= tasks.length) {
        navigator.vibrate?.(12);
      }
      return next;
    });
  };
  const retakeTask = (taskId) => {
    setCompletedTasks((current) => current.filter((completedId) => completedId !== taskId));
  };
  const progress = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  const previewImage = scanPreviewImages[currentSpace.id];
  const captureComplete = completedTasks.length >= tasks.length;
  const currentTask = tasks.find((task) => !completedTasks.includes(task.id)) ?? tasks[tasks.length - 1];

  return (
    <section className="screen scan-screen">
      <div className="scan-workspace">
        <div className="scan-session-bar">
          <div>
            <span>正在采集</span>
            <strong>{currentSpace.name}</strong>
          </div>
          <em>{completedTasks.length}/{tasks.length}</em>
        </div>

        <figure className="capture-viewfinder" style={{ "--image": `url(${assetUrl(previewImage)})` }}>
          <img src={assetUrl(previewImage)} alt={`${currentSpace.name}采集画面`} />
          <div className="viewfinder-corners" aria-hidden="true" />
          <figcaption>
            <span>已完成 {completedTasks.length}/{tasks.length}</span>
            <strong>{progress}%</strong>
          </figcaption>
        </figure>

        {captureComplete ? (
          <section className="scan-complete-panel" aria-live="polite">
            <div className="success-ring">
              <CheckCircle2 size={30} />
            </div>
            <div className="scan-complete-copy">
              <div className="complete-title-row">
                <strong>全部采集完成</strong>
                <span className="capture-done-pill">
                  <CheckCircle2 size={16} />
                  已完成
                </span>
              </div>
              <p>{tasks.length} 个关键视角已采集，下一步进入智能识别与评估。</p>
            </div>
          </section>
        ) : (
          <>
            <div className="capture-controls">
              <span className="capture-status">光线/对焦检查</span>
              <span>{currentTask.tip}</span>
            </div>
            <div className="progress-bar">
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="current-capture-card">
              <div>
                <span>当前目标</span>
                <strong>{currentTask.title}</strong>
                <small>{currentTask.target}</small>
              </div>
              <button onClick={() => completeTask(currentTask.id)}>
                <Camera size={18} />
                拍摄
              </button>
            </div>
          </>
        )}
      </div>

      <header className="task-list-heading">
        <div>
          <strong>{currentSpace.name}视角采集</strong>
          <span>按顺序补齐关键视角</span>
        </div>
        <small>{completedTasks.length}/{tasks.length}</small>
      </header>
      <div className="task-list capture-task-list">
        {tasks.map((task, index) => {
          const done = completedTasks.includes(task.id);
          return (
            <article className={`task-card ${done ? "done" : ""}`} key={task.id}>
              <div className="task-index">{index + 1}</div>
              <div>
                <h3>{task.title}</h3>
                <p>{task.tip}</p>
                <span>{task.target}</span>
              </div>
              {done ? (
                <button className="task-retake" type="button" onClick={() => retakeTask(task.id)}>
                  <RotateCcw size={15} />
                  重拍
                </button>
              ) : (
                <span className="task-state" aria-label="待采集"><span /></span>
              )}
            </article>
          );
        })}
      </div>

      <div className="scan-bottom-action">
        {captureComplete ? (
          <button className="primary-button full" onClick={goNext}>
            开始智能分析
            <Sparkles size={18} />
          </button>
        ) : (
          <button className="primary-button full" onClick={goNext} disabled={completedTasks.length < tasks.length}>
            完成采集，进入分析
            <Sparkles size={18} />
          </button>
        )}
      </div>
    </section>
  );
}

function AnalysisScreen({ currentSpace, tasks, risks, assessment, solutionRouting, completeAnalysis }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(7);
  const analysisItems = [
    {
      label: "整理采集画面",
      processingValue: "正在核对采集画面",
      completeValue: `${tasks.length} 个采集画面已就绪`
    },
    {
      label: "空间布局分析",
      processingValue: `${currentSpace.name}空间布局正在分析`,
      completeValue: `${currentSpace.name}动线、边界和重点区域已锁定`
    },
    {
      label: "风险点识别",
      processingValue: "正在定位疑似风险点",
      completeValue: "已识别主要风险点"
    },
    {
      label: "适老评估准则",
      processingValue: "正在结合通行、防滑与人工复核条件",
      completeValue: "评估准则已应用"
    },
    {
      label: "方案匹配预热",
      processingValue: "等待生成评估结果",
      completeValue: assessment.viewType === "PublishedRiskResult"
        ? `匹配方案 ${solutionRouting.demoCandidates.length} 项，待确认 ${solutionRouting.reviewTasks.length} 项`
        : "当前信息需要补充或人工确认"
    }
  ];
  const analysisProgressTargets = [17, 36, 57, 78, 100];
  const analysisProgressTarget = analysisProgressTargets[activeIndex] ?? analysisProgressTargets[analysisProgressTargets.length - 1];
  const analysisComplete = activeIndex >= analysisItems.length - 1 && analysisProgress >= 100;
  const activeItem = analysisItems[activeIndex] ?? analysisItems[analysisItems.length - 1];
  const analysisTitle = analysisComplete ? "识别完成" : "智能识别中";
  const analysisEyebrow = analysisComplete ? "分析完成" : "缓冲识别";
  const priorityRisks = risks.slice(0, 3);
  const getAnalysisItemValue = (item, index) => {
    if (analysisComplete) return item.completeValue;
    if (index === activeIndex) return item.processingValue;
    if (index < activeIndex) return "阶段处理完成，等待汇总输出";
    return "等待上一阶段完成";
  };
  const activeItemValue = getAnalysisItemValue(activeItem, activeIndex);

  useEffect(() => {
    if (activeIndex >= analysisItems.length - 1) return undefined;

    const timer = window.setTimeout(() => {
      setActiveIndex((current) => Math.min(analysisItems.length - 1, current + 1));
    }, 1650);

    return () => window.clearTimeout(timer);
  }, [activeIndex, analysisItems.length]);

  useEffect(() => {
    if (analysisProgress >= analysisProgressTarget) return undefined;

    const timer = window.setTimeout(() => {
      setAnalysisProgress((current) => Math.min(analysisProgressTarget, current + 1));
    }, 105);

    return () => window.clearTimeout(timer);
  }, [analysisProgress, analysisProgressTarget]);

  return (
    <section className="screen analysis-buffer-screen">
      <section className={`analysis-command-center ${analysisComplete ? "complete" : ""}`}>
        <header className="analysis-console-top">
          <div>
            <span className="eyebrow">{analysisEyebrow}</span>
            <h2>{analysisTitle}</h2>
          </div>
        </header>

        <div className="analysis-inline-recognition">
          <div className="inline-scan-icon">
            <Cpu size={18} />
          </div>
          <div>
            <span>当前识别</span>
            <strong>{analysisComplete ? "评估输出完成" : activeItem.label}</strong>
            <small>{analysisComplete
              ? (assessment.viewType === "PublishedRiskResult"
                ? "评估结果已生成，可继续查看改造建议"
                : "观察结果已整理，等待补充信息或专业复核")
              : activeItemValue}</small>
          </div>
        </div>

        <div className="analysis-progress-panel">
          <div>
            <span>识别进度</span>
            <strong>{analysisProgress}%</strong>
          </div>
          <div
            className="analysis-progress-track"
            role="progressbar"
            aria-label="智能分析进度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={analysisProgress}
          >
            <span style={{ width: `${analysisProgress}%` }} />
          </div>
        </div>
      </section>

      <p className="sr-only" aria-live="polite">
        {analysisComplete ? "智能分析完成" : `正在进行${activeItem.label}`}
      </p>

      {!analysisComplete && <section className="analysis-live-feed" aria-label="缓冲识别进程">
        <header>
          <div>
            <span>智能评估</span>
            <strong>分析处理记录</strong>
          </div>
          <em>{analysisComplete ? "已输出" : "处理中"}</em>
        </header>
        {analysisItems.map((item, index) => {
          const state = index < activeIndex ? "done" : index === activeIndex ? "active" : "";
          return (
            <article className={state} key={item.label}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{item.label}</strong>
                <small>{getAnalysisItemValue(item, index)}</small>
              </div>
              {index < activeIndex ? <CheckCircle2 size={17} /> : <Activity size={17} />}
            </article>
          );
        })}
      </section>}

      {analysisComplete && (
        <section className="analysis-result-summary" aria-label="识别结果摘要">
          <header>
            {assessment.viewType === "PublishedRiskResult" ? <CheckCircle2 size={21} /> : <AlertTriangle size={21} />}
            <div>
              <strong>{assessment.viewType === "PublishedRiskResult" ? "风险评估已完成" : "还需要补充信息"}</strong>
              <span>{assessment.viewType === "PublishedRiskResult"
                ? `${solutionRouting.demoCandidates.length} 项适配条件已核对，施工前仍需现场确认`
                : (assessment.reasons ?? ["需要补充信息或人工复核"]).join("；")}</span>
            </div>
          </header>
          <div>
            {priorityRisks.map((risk) => (
              <span key={risk.id}>
                <ShieldCheck size={14} />
                {risk.name}
              </span>
            ))}
          </div>
          <small>{assessment.viewType === "PublishedRiskResult"
            ? "评估报告已生成；无法确认安装条件的方案不会直接加入清单。"
            : "补充采集或完成专业复核后，才能生成可选方案。"}</small>
        </section>
      )}

      {analysisComplete ? (
        <button className="primary-button full" onClick={completeAnalysis}>
          查看评估结果
          <ArrowRight size={18} />
        </button>
      ) : (
        <button className="primary-button full analysis-wait-button" disabled>
          正在分析
          <Activity size={18} />
        </button>
      )}
    </section>
  );
}

function ReportScreen({ currentSpace, elderProfile, risks, report, solutionRouting, planItemIds, goNext, setStep }) {
  const [expandedRiskId, setExpandedRiskId] = useState(risks[0]?.id ?? null);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [reviewMethod, setReviewMethod] = useState("video");
  const [reviewTime, setReviewTime] = useState("工作日上午");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewRequest, setReviewRequest] = useState(null);
  const [reviewView, setReviewView] = useState("form");
  const profileTips = getProfileInsight(elderProfile, currentSpace);
  const humanFactorAssessment = buildHumanFactorAssessment(elderProfile, risks, report.assessment);
  const highRiskCount = risks.filter((risk) => risk.level === "高" || risk.level === "中高").length;
  const confirmedIndividualCount = humanFactorAssessment.individualFactors
    .filter((factor) => factor.value !== "待确认").length;
  const selectedActionIds = solutionRouting.demoCandidates
    .filter((solution) => planItemIds.includes(solution.product.id))
    .map((solution) => solution.actionId);
  const planProjection = buildPlanSafetyProjection({
    assessment: report.assessment,
    profile: elderProfile,
    actionIds: selectedActionIds
  });
  const postReviewProjection = reviewRequest
    ? buildPostReviewSafetyProjection({ spaceId: currentSpace?.id, profile: elderProfile })
    : null;
  const visibleProjection = planProjection ?? postReviewProjection;
  const hasScoredResult = report.formalInput || Boolean(postReviewProjection);
  const reviewRequirements = {
    bedroom: ["补拍夜间起身动线", "确认床侧通道与照明覆盖"],
    corridor: ["重新测量通道净宽", "核对门槛与地面障碍"],
    kitchen: ["确认关键操作动线", "补充地面与取物高度记录"],
    living: ["确认起身支撑条件", "补充主要通行路线记录"],
    balcony: ["确认门槛高差与排水", "补充晾晒操作范围记录"]
  }[currentSpace?.id] ?? ["补充缺失的空间信息", "由专业人员确认关键条件"];
  const submitReviewRequest = (event) => {
    event.preventDefault();
    setReviewRequest({ method: reviewMethod, time: reviewTime, note: reviewNote.trim() });
    setReviewView("success");
  };
  const openReviewSheet = () => {
    setReviewView(reviewRequest ? "status" : "form");
    setReviewSheetOpen(true);
  };

  return (
    <section className="screen">
      <div className={`score-card level-${postReviewProjection ? "risk-medium" : report.levelKey}${visibleProjection ? " with-projection" : ""}`}>
        <div>
          <span>当前风险等级</span>
          <strong>{postReviewProjection ? `${postReviewProjection.riskTier}风险` : report.riskTier === "待复核" ? report.riskTier : `${report.riskTier}风险`}</strong>
          <small>{postReviewProjection ? "人工复核后结果" : report.formalInput ? "当前评估结果" : "暂不显示安全数值"}</small>
        </div>
        {visibleProjection ? (
          <div
            className="score-card-comparison"
            aria-label={`当前安全分 ${visibleProjection.before}，方案完成后预估安全分 ${visibleProjection.after}`}
          >
            <div>
              <small>当前安全分</small>
              <strong>{visibleProjection.before}</strong>
            </div>
            <ArrowRight size={18} />
            <div className="projected">
              <small>改造后预估</small>
              <strong>{visibleProjection.after}</strong>
            </div>
            <em>完成后需复扫确认</em>
          </div>
        ) : (
          <div className="score-ring">
            <span>{report.safetyValue}</span>
            <small>{report.formalInput ? "安全分" : "结果状态"}</small>
          </div>
        )}
      </div>

      <div className="report-overview">
        <strong>{report.title}</strong>
        <span>{hasScoredResult
          ? `1 项综合风险结果 · ${risks.length} 处空间观察提示，${highRiskCount} 处建议优先关注`
          : `${risks.length} 处空间观察提示 · 当前结果等待补充信息或专业复核`}</span>
      </div>

      <p className="report-summary">{postReviewProjection
        ? "已根据补充证据和人工复核结果重新计算当前安全分；改造后数值为方案预估，执行完成后仍需同空间复扫确认。"
        : report.summary}</p>

      <section className={`result-gate-banner ${hasScoredResult ? "passed" : "review"}`}>
        {hasScoredResult ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}
        <div>
          <strong>{postReviewProjection ? "人工复核已完成" : report.formalInput ? "评估信息完整" : "需要补充信息或人工复核"}</strong>
          <span>{postReviewProjection
            ? `${postReviewProjection.reviewBasis.join("；")}。安全分越高越安全。`
            : report.formalInput
            ? "可以继续查看本次改造建议"
            : (report.assessment.reasons ?? ["需要补充信息或人工复核"]).join("；")}</span>
        </div>
      </section>

      {!report.formalInput && (
        <section className="review-action-panel" aria-label="结果复核操作">
          <header>
            <div>
              <span>下一步</span>
              <strong>{postReviewProjection ? "复核结果已生成" : reviewRequest ? "复核申请已记录" : "完成复核后生成安全分与方案"}</strong>
            </div>
            {reviewRequest && <CheckCircle2 size={20} />}
          </header>
          {postReviewProjection ? (
            <p>当前安全分 {postReviewProjection.before} · 改造后预估 {postReviewProjection.after} · 完成后需复扫确认</p>
          ) : reviewRequest ? (
            <p>
              {reviewRequest.method === "video" ? "视频复核" : "上门复核"} · {reviewRequest.time}
            </p>
          ) : (
            <ul>
              {reviewRequirements.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
          <div>
            <button type="button" className="secondary-button" onClick={() => setStep(2)}>
              <Camera size={17} />
              补充采集
            </button>
            <button type="button" className="primary-button" onClick={openReviewSheet}>
              <Headset size={17} />
              {postReviewProjection ? "查看复核结果" : reviewRequest ? "查看复核进度" : "申请人工复核"}
            </button>
          </div>
        </section>
      )}

      <section className="human-factor-panel" aria-label="人因风险判断">
        <header>
          <div>
            <span>个性化判断依据</span>
            <strong>老人情况 × 空间风险</strong>
          </div>
          <em>用户确认</em>
        </header>
        <p>老人情况由用户主动确认，用于调整风险处理优先级，不代表生理传感数据。</p>
        <div className="human-factor-side">
          <b>个体侧</b>
          <div>
            {humanFactorAssessment.individualFactors.map((factor) => (
              <span className={factor.value === "待确认" ? "pending" : ""} key={factor.id}>
                <small>{factor.label}</small>
                <strong>{factor.value}</strong>
              </span>
            ))}
          </div>
        </div>
        <div className="human-factor-side spatial">
          <b>空间侧</b>
          <div>
            {humanFactorAssessment.spatialFactors.map((factor) => (
              <span className={factor.riskName ? "identified" : ""} key={factor.id}>
                <small>{factor.label}</small>
                <strong>{factor.status}</strong>
              </span>
            ))}
          </div>
        </div>
        <div className="human-factor-output">
          <ArrowRight size={17} />
          <div>
            <strong>{confirmedIndividualCount}/4 项关键信息已确认</strong>
            <span>信息缺失时不会默认低风险，将提示补充或人工确认。</span>
          </div>
        </div>
      </section>

      <section className="profile-insight">
        <span>本次个性化解释</span>
        {profileTips.length > 0 ? (
          <ul>
            {profileTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        ) : <p>补充个体情况后，将进一步调整风险提示重点。</p>}
      </section>

      <div className="risk-list">
        {risks.map((risk) => {
          const judgement = humanFactorAssessment.riskJudgements.find((item) => item.riskId === risk.id);
          return (
          <article className="risk-card" key={risk.id}>
            <header>
              <div>
                <span>{risk.riskType}</span>
                <h3>{risk.name}</h3>
              </div>
              <div className="risk-level-stack">
                <strong>{risk.level}</strong>
                <small>空间观察提示</small>
              </div>
            </header>
            {expandedRiskId === risk.id && (
              <div className="risk-detail-panel">
                <strong>空间侧依据</strong>
                <span>{risk.evidence.join("，")}。{risk.rule}</span>
                <strong>人因关联解释</strong>
                <span>{judgement?.reasons.join("；")}。</span>
                <strong>建议处理</strong>
                <span>{risk.action}</span>
              </div>
            )}
            <div className="risk-actions">
              <button type="button" onClick={() => setExpandedRiskId((current) => (current === risk.id ? null : risk.id))}>
                {expandedRiskId === risk.id ? "收起原因" : "查看原因"}
              </button>
              <button type="button" onClick={() => report.formalInput ? setStep(5) : openReviewSheet()}>
                {report.formalInput ? "匹配方案" : postReviewProjection ? "复核结果" : "申请复核"}
              </button>
            </div>
          </article>
          );
        })}
      </div>

      <button className="primary-button full" onClick={() => report.formalInput ? goNext() : openReviewSheet()}>
        {report.formalInput ? "查看方案匹配" : postReviewProjection ? "查看复核结果" : reviewRequest ? "查看复核进度" : "申请人工复核"}
        {report.formalInput ? <ArrowRight size={18} /> : <Headset size={18} />}
      </button>

      {reviewSheetOpen && (
        <div className="review-sheet-backdrop" role="presentation" onMouseDown={() => setReviewSheetOpen(false)}>
          <section
            className="review-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-sheet-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span>人工复核</span>
                <strong id="review-sheet-title">
                  {reviewView === "form" ? "选择复核方式" : reviewView === "success" ? "申请已提交" : postReviewProjection ? "复核结果" : "复核进度"}
                </strong>
              </div>
              <button type="button" aria-label="关闭复核申请" onClick={() => setReviewSheetOpen(false)}>
                <X size={20} />
              </button>
            </header>
            {reviewView === "form" && <form onSubmit={submitReviewRequest}>
              <div className="review-method-options" role="group" aria-label="复核方式">
                <button
                  type="button"
                  className={reviewMethod === "video" ? "active" : ""}
                  onClick={() => setReviewMethod("video")}
                >
                  <Camera size={18} />
                  <span><strong>视频复核</strong><small>在线核对空间与尺寸</small></span>
                </button>
                <button
                  type="button"
                  className={reviewMethod === "home" ? "active" : ""}
                  onClick={() => setReviewMethod("home")}
                >
                  <Home size={18} />
                  <span><strong>上门复核</strong><small>现场确认安装与通行条件</small></span>
                </button>
              </div>
              <label>
                方便时间
                <select value={reviewTime} onChange={(event) => setReviewTime(event.target.value)}>
                  <option>工作日上午</option>
                  <option>工作日下午</option>
                  <option>周末上午</option>
                  <option>周末下午</option>
                </select>
              </label>
              <label>
                补充说明（选填）
                <textarea
                  value={reviewNote}
                  maxLength={120}
                  rows={3}
                  placeholder="例如：家中老人使用手杖，希望重点确认通道宽度"
                  onChange={(event) => setReviewNote(event.target.value)}
                />
              </label>
              <button type="submit" className="primary-button full">提交复核申请</button>
            </form>}

            {reviewView === "success" && (
              <div className="review-success-view" role="status">
                <span className="review-success-icon"><CheckCircle2 size={30} /></span>
                <strong>复核申请已提交</strong>
                <p>{reviewMethod === "video" ? "视频复核" : "上门复核"} · {reviewTime}</p>
                <div>
                  <span>接下来</span>
                  <ol>
                    <li>核对本次采集资料</li>
                    <li>按复核重点补充证据或现场确认</li>
                    <li>重新评估后生成安全分与方案</li>
                  </ol>
                </div>
                <button type="button" className="primary-button full" onClick={() => setReviewView("status")}>
                  {postReviewProjection ? "查看复核结果" : "查看复核进度"}
                  <ArrowRight size={18} />
                </button>
                <button type="button" className="review-text-button" onClick={() => setReviewSheetOpen(false)}>返回评估报告</button>
              </div>
            )}

            {reviewView === "status" && reviewRequest && (
              <div className="review-status-view">
                {postReviewProjection ? (
                  <>
                    <section className="review-result-score" aria-label="复核后安全分结果">
                      <header>
                        <CheckCircle2 size={20} />
                        <div><span>复核完成</span><strong>{postReviewProjection.riskTier}风险</strong></div>
                      </header>
                      <div className="review-score-comparison">
                        <div><span>当前安全分</span><strong>{postReviewProjection.before}</strong></div>
                        <ArrowRight size={19} />
                        <div><span>改造后预估</span><strong>{postReviewProjection.after}</strong></div>
                      </div>
                      <small>安全分越高越安全 · 方案执行后需复扫确认</small>
                    </section>
                    <ol className="review-progress-list completed" aria-label="复核处理进度">
                      <li className="done">
                        <CheckCircle2 size={18} />
                        <div><strong>申请已提交</strong><span>复核方式和时间已记录</span></div>
                      </li>
                      <li className="done">
                        <CheckCircle2 size={18} />
                        <div><strong>空间条件已核对</strong><span>{postReviewProjection.reviewBasis.join("；")}</span></div>
                      </li>
                      <li className="done">
                        <CheckCircle2 size={18} />
                        <div><strong>评估结果已更新</strong><span>当前安全分和改造后预估已生成</span></div>
                      </li>
                    </ol>
                    <div className="review-status-actions">
                      <button type="button" className="secondary-button" onClick={() => setReviewView("form")}>修改复核信息</button>
                      <button type="button" className="primary-button" onClick={() => setReviewSheetOpen(false)}>查看评估报告</button>
                    </div>
                  </>
                ) : (
                  <>
                    <section className="review-status-summary">
                      <span>当前状态</span>
                      <strong>{reviewRequest.method === "video" ? "等待视频资料核对" : "等待上门复核"}</strong>
                      <p>{reviewRequest.method === "video" ? "视频复核" : "上门复核"} · {reviewRequest.time}</p>
                    </section>
                    <ol className="review-progress-list" aria-label="复核处理进度">
                      <li className="done">
                        <CheckCircle2 size={18} />
                        <div><strong>申请已提交</strong><span>复核方式和时间已记录</span></div>
                      </li>
                      <li className="active">
                        <Activity size={18} />
                        <div><strong>资料与空间条件核对</strong><span>重点确认缺失证据和冲突信息</span></div>
                      </li>
                      <li>
                        <span className="review-step-dot" />
                        <div><strong>重新生成评估结果</strong><span>复核完成后更新安全分与方案入口</span></div>
                      </li>
                    </ol>
                    <section className="review-focus-list">
                      <span>本次复核重点</span>
                      <ul>{reviewRequirements.map((item) => <li key={item}>{item}</li>)}</ul>
                    </section>
                    <div className="review-status-actions">
                      <button type="button" className="secondary-button" onClick={() => {
                        setReviewSheetOpen(false);
                        setStep(2);
                      }}>
                        <Camera size={17} />
                        补充采集
                      </button>
                      <button type="button" className="primary-button" onClick={() => setReviewView("form")}>
                        修改预约
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

function MatchScreen({ report, solutionRouting, risks, planItemIds, setPlanItemIds, goNext }) {
  const demoCandidates = solutionRouting.demoCandidates;
  const candidateByProductId = new Map(demoCandidates.map((solution) => [solution.product.id, solution]));
  const candidateProductIds = new Set(demoCandidates.map((solution) => solution.product.id));
  const selectedProducts = products.filter((product) =>
    planItemIds.includes(product.id) && candidateProductIds.has(product.id)
  );
  const selectedBudget = selectedProducts.reduce(
    (range, product) => {
      const budget = candidateByProductId.get(product.id)?.budget;
      return {
        min: range.min + (budget?.materialMin ?? 0),
        max: range.max + (budget?.materialMax ?? 0)
      };
    },
    { min: 0, max: 0 }
  );
  const togglePlanItem = (productId) => {
    if (!candidateProductIds.has(productId)) return;
    setPlanItemIds((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
    );
  };
  const recommendationGroups = risks.map((risk) => ({
    risk,
    solutions: demoCandidates.filter((solution) => solution.displayRisk?.id === risk.id)
  })).filter((group) => group.solutions.length > 0);
  const renderRecommendation = (solution, rank) => {
    const { product, displayRisk: risk } = solution;
    return (
      <article className="product-card recommendation-card" key={solution.solutionId}>
        <div className="plan-product-media recommendation-media" style={{ "--image": `url(${assetUrl(product.imageUrl)})` }}>
          <img className="plan-product-thumb" src={assetUrl(product.imageUrl)} alt={product.name} loading="lazy" />
          <span>{rank === 0 ? "优先候选" : "备选动作"}</span>
        </div>
        <div className="recommendation-content">
          <header>
            <span>{product.category}</span>
            <strong>{product.name}</strong>
          </header>
          <div className="recommendation-reason">
            <Target size={15} />
            <span><b>对应风险</b>{risk.name}</span>
          </div>
          <div className="recommendation-action">
            <b>改造动作</b>
            <span>{risk.action}</span>
          </div>
          <div className="recommendation-constraints">
            <span><b>适用条件</b>{product.condition}</span>
            <span><b>确认状态</b>适配条件已核对，施工前仍需现场确认</span>
          </div>
          <div className="product-meta">
            <span><b>预算</b> 模拟估价 {solution.budget.materialMin}-{solution.budget.materialMax} 元</span>
            <span>非报价</span>
          </div>
          <button
            className={planItemIds.includes(product.id) ? "selected-button inline" : "secondary-button inline"}
            onClick={() => togglePlanItem(product.id)}
          >
            {planItemIds.includes(product.id) ? "已在清单" : "加入清单"}
          </button>
        </div>
      </article>
    );
  };

  return (
    <section className="screen">
      <SectionTitle eyebrow="改造建议" title="为本次风险匹配方案" text="先核对空间与安装条件，无法确认的项目交由专业人员复核。" />

      <section className={`matching-gate ${report.formalInput ? "passed" : "review"}`}>
        {report.formalInput ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}
        <div>
          <strong>{report.formalInput ? `安全分 ${report.safetyValue} · ${report.riskTier}风险` : "暂不显示安全数值"}</strong>
          <span>{report.formalInput
            ? `越高越安全 · ${demoCandidates.length} 项适配条件已核对，施工前仍需现场确认`
            : "补充信息或完成专业复核后再生成方案"}</span>
        </div>
      </section>

      <section className="decision-engine-panel" aria-label="方案匹配">
        <header>
          <div className="engine-icon"><Cpu size={20} /></div>
          <div>
            <span>智能匹配</span>
            <strong>{report.formalInput ? "从风险到改造方向与方案候选" : "等待补充信息"}</strong>
          </div>
          <em>{demoCandidates.length} 项</em>
        </header>
        <ol className="matching-chain">
          {[
            ["01", "风险识别", report.riskTier],
            ["02", "改造方向", report.formalInput ? "已生成" : "待补充"],
            ["03", "安装条件", demoCandidates.length ? "适配条件已核对" : "待确认"],
            ["04", "可选方案", `${demoCandidates.length} 项`],
            ["05", "改造后复扫", "验证效果"]
          ].map(([index, label, value]) => (
            <li key={label}>
              <small>{index}</small>
              <strong>{label}</strong>
              <span>{value}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="budget-card">
        <div>
          <span>当前方案清单</span>
          <strong>{selectedProducts.length ? `${selectedProducts.length} 项 · ${selectedBudget.min}-${selectedBudget.max} 元` : "尚未选择方案"}</strong>
        </div>
        <small>模拟估价/非报价，实际费用需现场确认。</small>
      </div>

      {solutionRouting.reviewTasks.length > 0 && (
        <section className="review-task-list" aria-label="复核任务">
          <header>
            <AlertTriangle size={18} />
            <div><strong>需要现场确认</strong><span>确认前不加入方案清单</span></div>
          </header>
          {solutionRouting.reviewTasks.map((task) => (
            <article key={task.reviewTaskId}>
              <strong>{task.product?.name ?? "上游风险结果复核"}</strong>
              <span>{task.triggerDetail}</span>
              <small>{task.suggestedReviewMethod}</small>
            </article>
          ))}
        </section>
      )}

      <div className="recommendation-groups">
        {recommendationGroups.map(({ risk, solutions }) => (
          <section className="recommendation-group" key={risk.id}>
            <header className="recommendation-group-heading">
              <div><span>{risk.level}风险项</span><strong>{risk.name}</strong></div>
              <small>{solutions.length} 项可选方案</small>
            </header>
            <div className="product-list">
              {solutions.slice(0, 2).map((solution, rank) => renderRecommendation(solution, rank))}
            </div>
            {solutions.length > 2 && (
              <details className="recommendation-more">
                <summary>查看其余 {solutions.length - 2} 项候选</summary>
                <div className="product-list">
                  {solutions.slice(2).map((solution) => renderRecommendation(solution, 1))}
                </div>
              </details>
            )}
          </section>
        ))}
      </div>

      <button className="primary-button full" onClick={goNext}>
        {demoCandidates.length ? "查看方案预览" : "查看需确认事项"}
        <ArrowRight size={18} />
      </button>
    </section>
  );
}

function MallScreen({
  currentSpace,
  hasAssessment,
  matchedProducts,
  solutionRouting,
  report,
  risks,
  planItemIds,
  setPlanItemIds,
  setActiveEntrance,
  setStep
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedShelfFilter, setSelectedShelfFilter] = useState("all");
  const [sortMode, setSortMode] = useState("recommended");
  const [sortPanelOpen, setSortPanelOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [visibleProductLimit, setVisibleProductLimit] = useState(8);
  const recommendedIds = new Set(hasAssessment ? matchedProducts.map((product) => product.id) : []);
  const candidateByProductId = new Map(
    (hasAssessment ? solutionRouting.demoCandidates : []).map((solution) => [solution.product.id, solution])
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const productCategory = productCategoryMap[product.category] ?? "all";
    const productRiskText = riskRules
      .filter((risk) => product.riskIds?.includes(risk.id))
      .map((risk) => `${risk.name}${risk.action}`)
      .join("");
    const matchesCategory = selectedCategory === "all" || selectedCategory === productCategory;
    const matchesQuery =
      !normalizedQuery ||
      `${product.name}${product.category}${product.condition}${productRiskText}`.toLowerCase().includes(normalizedQuery);
    const matchesShelf =
      selectedShelfFilter === "all" ||
      (selectedShelfFilter === "recommended" && recommendedIds.has(product.id)) ||
      (selectedShelfFilter === "ready" && !product.requiresReview) ||
      (selectedShelfFilter === "install" && product.requiresReview) ||
      (selectedShelfFilter === "budget" && product.budgetMax <= 200);

    return matchesCategory && matchesQuery && matchesShelf;
  }).sort((a, b) => {
    if (sortMode === "budget") return a.budgetMin - b.budgetMin;
    if (sortMode === "ready") return Number(a.requiresReview) - Number(b.requiresReview);
    return Number(recommendedIds.has(b.id)) - Number(recommendedIds.has(a.id));
  });
  const selectedProducts = products.filter((product) =>
    planItemIds.includes(product.id) && recommendedIds.has(product.id)
  );
  const selectedBudget = selectedProducts.reduce(
    (range, product) => {
      const budget = candidateByProductId.get(product.id)?.budget;
      return {
        min: range.min + (budget?.materialMin ?? 0),
        max: range.max + (budget?.materialMax ?? 0)
      };
    },
    { min: 0, max: 0 }
  );
  const togglePlanItem = (productId) => {
    if (!hasAssessment) return;
    setPlanItemIds((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
    );
  };

  useEffect(() => {
    setVisibleProductLimit(8);
  }, [normalizedQuery, selectedCategory, selectedShelfFilter, sortMode]);

  const visibleProducts = filteredProducts.slice(0, visibleProductLimit);
  const hasMoreProducts = visibleProducts.length < filteredProducts.length;
  const categoryItems = mallCategories;
  const shelfFilters = [
    { id: "all", label: "全部" },
    { id: "recommended", label: "报告推荐", disabled: !hasAssessment },
    { id: "ready", label: "免施工" },
    { id: "install", label: "需安装" },
    { id: "budget", label: "低预算" }
  ];

  return (
    <section className="screen marketplace-screen">
      <header className="mall-library-header">
        <div>
          <h2>适老方案库</h2>
          <p>{hasAssessment ? `${currentSpace.name}评估已接入，优先展示匹配方案` : "精选适老产品与服务，评估后获取专属方案"}</p>
        </div>
        <button
          className="mall-plan-button"
          onClick={() => {
            if (hasAssessment) {
              setActiveEntrance("scan");
              setStep(5);
            } else {
              setActiveEntrance("scan");
              setStep(1);
            }
          }}
        >
          <ClipboardList size={18} />
          <span>方案单</span>
          {hasAssessment && <strong>{selectedProducts.length}</strong>}
        </button>
      </header>

      <div className="mall-toolbar">
        <label className="mall-search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索产品、服务或适用位置" />
        </label>
        <button className="mall-sort-button" type="button" aria-expanded={sortPanelOpen} onClick={() => setSortPanelOpen((open) => !open)}>
          <SlidersHorizontal size={18} />
          排序
        </button>
      </div>

      {sortPanelOpen && (
        <div className="mall-sort-panel" aria-label="商品排序">
          {[
            { id: "recommended", label: "推荐优先" },
            { id: "budget", label: "预算从低到高" },
            { id: "ready", label: "免施工优先" }
          ].map((option) => (
            <button key={option.id} type="button" className={sortMode === option.id ? "active" : ""} onClick={() => { setSortMode(option.id); setSortPanelOpen(false); }}>
              {option.label}
            </button>
          ))}
        </div>
      )}

      <div className="mall-shelf-filters" role="tablist" aria-label="适用条件筛选">
        {shelfFilters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            role="tab"
            disabled={filter.disabled}
            aria-selected={selectedShelfFilter === filter.id}
            className={selectedShelfFilter === filter.id ? "active" : ""}
            onClick={() => setSelectedShelfFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mall-catalog-shell">
        <aside className="mall-category-rail" aria-label="产品品类">
          {categoryItems.map((category) => {
            const Icon = categoryIcon[category.id] ?? Sparkles;
            return (
              <button
                key={category.id}
                type="button"
                className={selectedCategory === category.id ? "active" : ""}
                onClick={() => setSelectedCategory(category.id)}
                aria-pressed={selectedCategory === category.id}
              >
                <Icon size={21} />
                <span>{category.label}</span>
              </button>
            );
          })}
        </aside>

        <div className="mall-product-column">
          <div className="mall-list-heading">
            <strong>{mallCategories.find((category) => category.id === selectedCategory)?.label ?? "全部"}</strong>
            <span>{filteredProducts.length} 项</span>
          </div>
          {visibleProducts.length > 0 ? (
            <div className="mall-product-list" aria-live="polite">
              {visibleProducts.map((product) => {
                const linkedRisks = getRecommendedRisksForProduct(risks, product);
                const catalogRisk = linkedRisks[0] ?? riskRules.find((risk) => product.riskIds?.includes(risk.id));
                const isRecommended = recommendedIds.has(product.id);
                const isSelected = planItemIds.includes(product.id);
                const canAddToPlan = hasAssessment && isRecommended;
                const candidateBudget = candidateByProductId.get(product.id)?.budget;
                const displayBudgetMin = candidateBudget?.materialMin ?? product.budgetMin;
                const displayBudgetMax = candidateBudget?.materialMax ?? product.budgetMax;
                const catalogActionLabel = canAddToPlan
                  ? `${isSelected ? "移出" : "加入"}${product.name}`
                  : `查看${product.name}匹配条件`;
                return (
                  <article className={`mall-product-row ${isRecommended ? "recommended" : ""}`} key={product.id}>
                    <div className="mall-product-media product-image" style={{ "--image": `url(${assetUrl(product.imageUrl)})` }}>
                      <img src={assetUrl(product.imageUrl)} alt={product.name} loading="lazy" />
                      {isRecommended && <span>推荐</span>}
                    </div>
                    <div className="mall-product-info">
                      <div className="mall-product-title">
                        <strong>{product.name}</strong>
                        <small>{product.category}</small>
                      </div>
                      <p>{product.subtitle}</p>
                      <ul>
                        {product.specs.slice(0, 1).map((spec) => <li key={spec}>{spec}</li>)}
                      </ul>
                      {catalogRisk && (
                        <div className="mall-match-details">
                          <span><b>对应风险</b>{catalogRisk.name}</span>
                          <span><b>改造动作</b>{catalogRisk.action}</span>
                        </div>
                      )}
                      <div className="mall-constraint-line">
                        <span>{isRecommended ? "适配条件已核对" : "需结合空间条件确认"}</span>
                        <span>{isRecommended ? "施工前仍需现场确认" : product.condition}</span>
                      </div>
                      <div className="mall-product-footer">
                        <div>
                          <small>模拟估价 · 非报价</small>
                          <strong>{displayBudgetMin}-{displayBudgetMax} 元</strong>
                        </div>
                        <button
                          type="button"
                          className={isSelected ? "selected" : ""}
                          aria-label={catalogActionLabel}
                          title={canAddToPlan
                            ? (isSelected ? "移出方案单" : "加入方案单")
                            : "查看风险匹配条件"}
                          onClick={() => {
                            if (canAddToPlan) togglePlanItem(product.id);
                            else {
                              setActiveEntrance("scan");
                              setStep(hasAssessment ? 5 : 1);
                            }
                          }}
                        >
                          {isSelected
                            ? <CheckCircle2 size={18} />
                            : canAddToPlan
                              ? <Plus size={18} />
                              : <ArrowRight size={18} />}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mall-empty-state">
              <Search size={22} />
              <strong>没有找到对应方案</strong>
              <span>可尝试更换关键词或查看其他分类</span>
            </div>
          )}

          {filteredProducts.length > 0 && (
            <div className="catalog-load-control">
              <span>已展示 {visibleProducts.length} / {filteredProducts.length} 项</span>
              {hasMoreProducts ? (
                <button type="button" onClick={() => setVisibleProductLimit((current) => Math.min(current + 8, filteredProducts.length))}>
                  展开更多
                  <Plus size={17} />
                </button>
              ) : <strong>已展示全部</strong>}
            </div>
          )}
        </div>
      </div>

      <button
        className="mall-guidance-bar"
        type="button"
        onClick={() => {
          setActiveEntrance("scan");
          setStep(hasAssessment ? 5 : 1);
        }}
      >
        <span>
          <strong>{hasAssessment ? `已选 ${selectedProducts.length} 项方案` : "不知道如何选择？"}</strong>
          <small>{hasAssessment ? `模拟估价 ${selectedBudget.min}-${selectedBudget.max} 元 · 非报价` : "完成空间评估，获取针对性改造建议"}</small>
        </span>
        <b>
          {hasAssessment ? "查看方案单" : "开始评估"}
          <ArrowRight size={18} />
        </b>
      </button>
    </section>
  );
}

function PlanPreviewScreen({
  report,
  elderProfile,
  sampleCase,
  solutionRouting,
  risks,
  planItemIds,
  planConfirmed,
  setPlanConfirmed,
  setStep
}) {
  const candidateByProductId = new Map(solutionRouting.demoCandidates.map((solution) => [solution.product.id, solution]));
  const candidateProductIds = new Set(candidateByProductId.keys());
  const selectedProducts = products.filter((product) =>
    planItemIds.includes(product.id) && candidateProductIds.has(product.id)
  );
  const hasPlanItems = report.formalInput && canConfirmPlan(selectedProducts.map((product) => product.id));
  const previewProducts = selectedProducts;
  const selectedActionIds = solutionRouting.demoCandidates
    .filter((solution) => selectedProducts.some((product) => product.id === solution.product.id))
    .map((solution) => solution.actionId);
  const planProjection = buildPlanSafetyProjection({
    assessment: report.assessment,
    profile: elderProfile,
    actionIds: selectedActionIds
  });

  return (
    <section className="screen plan-preview-screen">
      <SectionTitle eyebrow="效果预览" title="确认执行与复扫路径" text="当前数值来自本次评估；方案执行后需重新采集，确认最终安全分。" />

      <div className="preview-summary">
        <div>
          <span>当前安全分</span>
          <strong>{report.safetyValue}</strong>
        </div>
        <ArrowRight size={18} />
        <div>
          <span>改造后预估</span>
          <strong>{planProjection?.after ?? "--"}</strong>
        </div>
        <small>安全分越高越安全 · 已选 {selectedProducts.length} 项改造措施 · 完成后需复扫确认</small>
      </div>

      {planConfirmed && (
        <div className="preview-confirmed" role="status">
          <CheckCircle2 size={18} />
          <span>方案单已确认，可继续在方案商城查看商品和服务。</span>
        </div>
      )}

      <section className="selected-plan-summary">
        <header>
          <div>
            <span>已选改造方案</span>
            <strong>{previewProducts.length} 项措施待确认</strong>
          </div>
          <button type="button" onClick={() => setStep(5)}>调整</button>
        </header>
        <div className="preview-plan-list">
          {previewProducts.length ? previewProducts.map((product) => (
            <article key={product.id}>
              <span className="preview-product-thumb" style={{ "--image": `url(${assetUrl(product.imageUrl)})` }}>
                <img src={assetUrl(product.imageUrl)} alt={product.name} loading="lazy" />
              </span>
              <div>
                <strong>{product.name}</strong>
                <span>{product.category} · 模拟估价 {candidateByProductId.get(product.id)?.budget.materialMin}-{candidateByProductId.get(product.id)?.budget.materialMax} 元</span>
              </div>
              <CheckCircle2 size={18} />
            </article>
          )) : <p className="empty-plan-message">至少选择一项改造方案后才能确认，请返回调整清单。</p>}
        </div>
        <p className="rescan-reminder">
          <RotateCcw size={16} />
          完成改造后按原路径复扫，确认最终安全分
        </p>
      </section>

      <section className="effect-preview-block" aria-label={`${sampleCase?.title}复扫对比`}>
        <header>
          <div>
            <span>{sampleCase?.comparisonVerified ? "空间效果对比" : "复扫对比"}</span>
            <strong>{sampleCase?.title}</strong>
          </div>
          <small>{sampleCase?.comparisonVerified ? "同一空间记录" : "按相同视角重新采集后生成"}</small>
        </header>
        {sampleCase?.comparisonVerified && sampleCase?.comparisonImage ? (
          <figure className="effect-comparison-single">
            <img src={assetUrl(sampleCase.comparisonImage)} alt={sampleCase.comparisonAlt} />
            <figcaption>同一空间改造前后实景</figcaption>
          </figure>
        ) : (
          <div className="comparison-pending-state">
            <RotateCcw size={25} />
            <div>
              <strong>完成同空间复扫后生成对比</strong>
              <span>改造前后使用同一拍摄位置和视角，避免将不同住宅图片错误拼接。</span>
            </div>
          </div>
        )}
      </section>

      <div className="case-card preview-case validation-path">
        <span>效果验证闭环</span>
        <h3>执行后重新评估，确认最终安全分</h3>
        <ol>
          <li>方案执行与安装记录</li>
          <li>改造后同空间复扫</li>
          <li>按相同采集要求重新评估</li>
          <li>对比改造前后风险和使用体验</li>
        </ol>
      </div>

      <div className="action-row">
        <button className="secondary-button" onClick={() => setStep(5)}>
          调整清单
        </button>
        <button
          className="primary-button"
          disabled={!hasPlanItems}
          onClick={() => setPlanConfirmed(true)}
        >
          {planConfirmed ? "已确认" : report.formalInput ? "确认方案单" : "等待复核"}
          <CheckCircle2 size={18} />
        </button>
      </div>
    </section>
  );
}

function CommunityScreen({ communityFeed, setCommunityFeed, setActiveEntrance }) {
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftTopic, setDraftTopic] = useState("share");
  const [draftSpace, setDraftSpace] = useState("living");
  const [draftImageData, setDraftImageData] = useState("");
  const [draftError, setDraftError] = useState("");
  const postDraft = {
    title: draftTitle,
    content: draftContent,
    topic: draftTopic,
    space: draftSpace,
    imageData: draftImageData
  };
  const canPublish = isCommunityPostDraftValid(postDraft);
  const visiblePosts = communityFeed.filter(
    (post) => selectedTopic === "all" || post.topic === selectedTopic
  );
  const resetComposer = () => {
    setDraftTitle("");
    setDraftContent("");
    setDraftTopic("share");
    setDraftSpace("living");
    setDraftImageData("");
    setDraftError("");
  };
  const closeComposer = () => {
    resetComposer();
    setComposerOpen(false);
  };
  const handleDraftImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      setDraftError("图片请控制在 1MB 以内");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDraftImageData(typeof reader.result === "string" ? reader.result : "");
      setDraftError("");
    };
    reader.readAsDataURL(file);
  };
  const publishPost = () => {
    if (!canPublish) return;

    const topicMeta = communityTopics.find((topic) => topic.id === draftTopic);

    const post = createCommunityPost(postDraft, {
      badge: topicMeta?.label ?? "经验分享"
    });

    setCommunityFeed((current) => [post, ...current]);
    setSelectedTopic(draftTopic);
    closeComposer();
  };
  const updatePost = (postId, updater) => {
    setCommunityFeed((current) => current.map((post) => (post.id === postId ? updater(post) : post)));
  };

  return (
    <section className="screen community-screen">
      <div className="community-topbar">
        <div>
          <h2>效果社区</h2>
          <small>人因评价与改造反馈</small>
        </div>
        <button className="post-button" onClick={() => setComposerOpen((value) => !value)}>
          <Plus size={18} />
          发帖
        </button>
      </div>

      {composerOpen && (
        <section className="composer-card">
          <header>
            <strong>发布到效果社区</strong>
            <span>分享改造经验或提出具体问题</span>
          </header>
          <div className="composer-fields">
            <label>
              <span>话题</span>
              <select value={draftTopic} onChange={(event) => setDraftTopic(event.target.value)}>
                {communityTopics.filter((topic) => topic.id !== "all").map((topic) => (
                  <option value={topic.id} key={topic.id}>{topic.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>空间</span>
              <select value={draftSpace} onChange={(event) => setDraftSpace(event.target.value)}>
                {spaces.map((space) => <option value={space.id} key={space.id}>{space.name}</option>)}
              </select>
            </label>
          </div>
          <label className="composer-wide-field">
            <span>标题</span>
            <input
              value={draftTitle}
              maxLength={inputLimits.communityTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="例如：卫生间装扶手后复扫结果"
            />
          </label>
          <label className="composer-wide-field">
            <span>正文</span>
            <textarea
              value={draftContent}
              maxLength={inputLimits.communityContent}
              onChange={(event) => setDraftContent(event.target.value)}
              placeholder="写下改造前问题、采用的方案、复扫变化或想咨询的问题"
              rows={4}
            />
          </label>
          <div className="composer-media-row">
            <label className="image-upload-button">
              <ImagePlus size={17} />
              {draftImageData ? "更换图片" : "添加图片"}
              <input type="file" accept="image/*" onChange={handleDraftImage} />
            </label>
            {draftImageData && <img src={draftImageData} alt="待发布图片预览" />}
          </div>
          {draftError && <p className="composer-error" role="alert">{draftError}</p>}
          <div className="composer-actions">
            <button className="secondary-button" onClick={closeComposer}>
              取消
            </button>
            <button className="primary-button" onClick={publishPost} disabled={!canPublish}>
              发布
              <Send size={16} />
            </button>
          </div>
        </section>
      )}

      <div className="community-tabs feed-tabs" aria-label="社区话题">
        {communityTopics.map((topic) => (
          <button
            className={selectedTopic === topic.id ? "active" : ""}
            key={topic.id}
            onClick={() => setSelectedTopic(topic.id)}
          >
            {topic.label}
          </button>
        ))}
      </div>

      <div className="feed-list">
        {visiblePosts.map((post) => {
          const hasRescan = post.rescanStatus === "复扫完成";
          return (
            <article className="feed-post" key={post.id}>
              <header className="feed-author">
                <div className="avatar">{post.author.slice(0, 1)}</div>
                <div>
                  <strong>{post.author}</strong>
                  <span>{post.role} · {post.location} · {formatPostTime(post.publishedAt)}</span>
                </div>
                <em>{post.badge}</em>
              </header>
              {post.images?.length > 0 && (
                <div className={`post-image-grid count-${Math.min(post.images.length, 2)}`}>
                  {post.images.slice(0, 2).map((imageUrl, imageIndex) => (
                    <span
                      className="post-image-frame"
                      key={imageUrl}
                      style={{
                        "--image": `url(${assetUrl(imageUrl)})`,
                        aspectRatio: post.imageAspects?.[imageIndex]
                      }}
                    >
                      <img
                        src={assetUrl(imageUrl)}
                        alt={post.imageAlts?.[imageIndex] ?? `${post.title}配图`}
                        style={{
                          objectPosition: post.imagePositions?.[imageIndex] ?? "center",
                          objectFit: post.imageFits?.[imageIndex] ?? "cover"
                        }}
                      />
                    </span>
                  ))}
                </div>
              )}
              <h3>{post.title}</h3>
              {hasRescan ? (
                <div className="rescan-state">
                  <CheckCircle2 size={17} />
                  <div>
                    <strong>已完成改造后复扫</strong>
                    <span>具体变化以改造后的新评估结果为准</span>
                  </div>
                </div>
              ) : (
                <div className="question-state">
                  <MessageSquare size={17} />
                  <span>待社区回复或人工复核</span>
                </div>
              )}
              {hasRescan && post.safetyComparison && (
                <div
                  className="rescan-score-comparison"
                  aria-label={`安全分由 ${post.safetyComparison.before} 提升至 ${post.safetyComparison.after}`}
                >
                  <span>
                    <small>改造前</small>
                    <strong>{post.safetyComparison.before}</strong>
                  </span>
                  <ArrowRight size={18} />
                  <span className="rescan-score-after">
                    <small>复扫后</small>
                    <strong>{post.safetyComparison.after}</strong>
                  </span>
                  <em>+{post.safetyComparison.after - post.safetyComparison.before}</em>
                  <small className="rescan-score-note">安全分越高越安全</small>
                </div>
              )}
              <p>{post.content}</p>
              <div className="action-list compact">
                {post.actions.map((action) => (
                  <div key={action}>
                    <CheckCircle2 size={15} />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
              <footer className="post-actions">
                <button aria-label={`点赞 ${post.likes}`} onClick={() => updatePost(post.id, (item) => ({ ...item, likes: item.likes + 1 }))}>
                  <Heart size={16} />
                  {post.likes}
                </button>
                <button aria-label={`评论 ${post.comments}`} onClick={() => updatePost(post.id, (item) => ({ ...item, comments: item.comments + 1 }))}>
                  <MessageSquare size={16} />
                  {post.comments}
                </button>
                <button aria-label={`收藏 ${post.saves}`} onClick={() => updatePost(post.id, (item) => ({ ...item, saves: item.saves + 1 }))}>
                  <Bookmark size={16} />
                  {post.saves}
                </button>
              </footer>
            </article>
          );
        })}
      </div>

      <button className="primary-button full" onClick={() => setActiveEntrance("scan")}>
        发起新的评估
        <Camera size={18} />
      </button>
    </section>
  );
}

function formatPostTime(publishedAt) {
  if (!publishedAt) return "刚刚";

  const publishedDate = new Date(publishedAt);
  if (Number.isNaN(publishedDate.getTime())) return "刚刚";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric"
  }).format(publishedDate);
}

function ProfilePanel({ profile, setProfile }) {
  const [editing, setEditing] = useState(false);
  const [draftProfile, setDraftProfile] = useState(profile);
  const parsedAge = Number.parseInt(draftProfile.age, 10);
  const displayAge = Number.isFinite(parsedAge) ? parsedAge : 75;
  const profileReady = isProfileComplete(profile);
  const profileSummary = profileReady
    ? `${profile.age}岁｜${profile.mobility}｜${profile.assistance}`
    : "请确认老人情况";
  const openEditor = () => {
    setDraftProfile(profile);
    setEditing(true);
  };
  const cancelEditing = () => {
    setDraftProfile(profile);
    setEditing(false);
  };
  const updateProfile = (field, value) => {
    setDraftProfile((current) => ({ ...current, [field]: value }));
  };
  const updateAge = (delta) => {
    const nextAge = Math.min(100, Math.max(55, displayAge + delta));
    updateProfile("age", String(nextAge));
  };
  const saveProfile = () => {
    setProfile(commitProfileDraft(draftProfile));
    setEditing(false);
  };

  return (
    <section className="profile-panel">
      <header className="profile-heading">
        <div>
          <span>本次评估对象</span>
          <strong>{profileSummary}</strong>
        </div>
        <button type="button" onClick={editing ? cancelEditing : openEditor}>
          <Edit3 size={15} />
          {editing ? "取消修改" : "确认/修改"}
        </button>
      </header>
      <p>
        {profileReady ? `${profile.notes}。重点关注：${profile.focus}。` : "填写后将用于调整风险提示重点。"}
      </p>
      <small className="profile-source-note">用户主动确认 · 不采集生理传感数据</small>

      {editing && (
        <div className="profile-form">
          <div className="profile-age-field">
            <span>年龄</span>
            <div className="age-stepper" role="group" aria-label="年龄选择">
              <button type="button" onClick={() => updateAge(-1)} aria-label="减少年龄">
                <Minus size={16} />
              </button>
              <strong>{displayAge}<small>岁</small></strong>
              <button type="button" onClick={() => updateAge(1)} aria-label="增加年龄">
                <Plus size={16} />
              </button>
            </div>
          </div>
          <label>
            <span>居住情况</span>
            <select value={draftProfile.living} onChange={(event) => updateProfile("living", event.target.value)}>
              <option>待确认</option>
              <option>独居</option>
              <option>与配偶同住</option>
              <option>与子女同住</option>
              <option>白天独处</option>
            </select>
          </label>
          <label>
            <span>行动情况</span>
            <select value={draftProfile.mobility} onChange={(event) => updateProfile("mobility", event.target.value)}>
              <option>待确认</option>
              <option>正常行走</option>
              <option>使用手杖</option>
              <option>使用助行器</option>
              <option>轮椅辅助</option>
              <option>需他人协助</option>
            </select>
          </label>
          <label>
            <span>平衡状态</span>
            <select value={draftProfile.balance} onChange={(event) => updateProfile("balance", event.target.value)}>
              <option>待确认</option>
              <option>平衡能力正常</option>
              <option>平衡能力受限</option>
            </select>
          </label>
          <label>
            <span>近年跌倒情况</span>
            <select value={draftProfile.fallHistory} onChange={(event) => updateProfile("fallHistory", event.target.value)}>
              <option>待确认</option>
              <option>未报告跌倒</option>
              <option>有跌倒经历</option>
            </select>
          </label>
          <label>
            <span>视力情况</span>
            <select value={draftProfile.vision} onChange={(event) => updateProfile("vision", event.target.value)}>
              <option>待确认</option>
              <option>日常视物正常</option>
              <option>弱光下视物困难</option>
              <option>视力明显受限</option>
            </select>
          </label>
          <label>
            <span>握力/支撑能力</span>
            <select value={draftProfile.grip} onChange={(event) => updateProfile("grip", event.target.value)}>
              <option>待确认</option>
              <option>可稳定抓握</option>
              <option>抓握力量较弱</option>
              <option>起身需要借力</option>
              <option>需他人提供支撑</option>
            </select>
          </label>
          <label>
            <span>是否需要辅助</span>
            <select value={draftProfile.assistance} onChange={(event) => updateProfile("assistance", event.target.value)}>
              <option>待确认</option>
              <option>可独立完成</option>
              <option>偶尔需要陪同</option>
              <option>部分动作需辅助</option>
              <option>多数动作需照护</option>
            </select>
          </label>
          <label>
            <span>夜间情况</span>
            <select value={draftProfile.night} onChange={(event) => updateProfile("night", event.target.value)}>
              <option>待确认</option>
              <option>很少起夜</option>
              <option>偶尔起夜</option>
              <option>起夜频繁</option>
              <option>夜间需照护</option>
            </select>
          </label>
          <label>
            <span>本空间日均使用</span>
            <select value={draftProfile.spaceUseFrequency} onChange={(event) => updateProfile("spaceUseFrequency", event.target.value)}>
              <option>待确认</option>
              <option>1 次/日</option>
              <option>2 次/日</option>
              <option>4 次/日</option>
              <option>6 次/日</option>
              <option>8 次/日</option>
            </select>
          </label>
          <label>
            <span>重点关注</span>
            <select value={draftProfile.focus} onChange={(event) => updateProfile("focus", event.target.value)}>
              <option>防跌倒与通行安全</option>
              <option>卫生间防跌倒</option>
              <option>起夜照明</option>
              <option>门槛高差</option>
              <option>起身支撑</option>
              <option>通道通行</option>
            </select>
          </label>
          <label>
            <span>补充情况</span>
            <input
              value={draftProfile.notes}
              maxLength={inputLimits.profileNotes}
              onChange={(event) => updateProfile("notes", event.target.value)}
            />
          </label>
          <div className="profile-form-actions">
            <button type="button" className="secondary-button" onClick={cancelEditing}>取消</button>
            <button type="button" className="primary-button" onClick={saveProfile}>保存老人情况</button>
          </div>
        </div>
      )}
    </section>
  );
}

function SectionTitle({ eyebrow, title, text }) {
  return (
    <header className="section-title">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </header>
  );
}

function Metric({ value, label }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default App;
