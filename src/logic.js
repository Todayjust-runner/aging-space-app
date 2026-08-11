import {
  buildSafetyDisplayView,
  buildRescanSafetyComparison,
  buildPlanSafetyProjection,
  buildPostReviewSafetyProjection,
  buildSolutionRouting,
  calculatePatentRiskAssessment,
  calculatePatentRiskValue,
  calculatePlanCoverage,
  convertRiskValueToSafety,
  demoConstraintFixtures,
  demoP2MappingRules,
  deriveProfileParameters,
  formatSafetyDisplayValue,
  formatRiskValue,
  getResultKindLabel,
  isFormalPublishedAssessment,
  patentBaseline,
  validateTraceIntegrity
} from "./patentModel.js";

export const levelWeight = {
  "低": 1,
  "中": 2,
  "中高": 3,
  "高": 4
};

export const inputLimits = {
  profileNotes: 120,
  communityTitle: 60,
  communityContent: 500,
  communityImageData: 2_100_000
};

const profileFields = [
  "age",
  "living",
  "mobility",
  "vision",
  "grip",
  "assistance",
  "balance",
  "fallHistory",
  "night",
  "spaceUseFrequency",
  "focus",
  "notes"
];

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clampInteger(value, min, max) {
  if (!Number.isInteger(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanStringList(value, allowedValues = null, limit = 20) {
  if (!Array.isArray(value)) return [];
  const allowed = allowedValues ? new Set(allowedValues) : null;
  return Array.from(new Set(value.filter((item) =>
    typeof item === "string" && (!allowed || allowed.has(item))
  ))).slice(0, limit);
}

function sanitizeStoredProfile(profile) {
  if (!isRecord(profile)) return {};

  return profileFields.reduce((result, field) => {
    const maxLength = field === "notes" ? inputLimits.profileNotes : 40;
    const value = cleanText(profile[field], maxLength);
    if (!value) return result;

    if (field === "age") {
      const age = Number.parseInt(value, 10);
      if (Number.isFinite(age)) result.age = String(Math.min(100, Math.max(55, age)));
      return result;
    }

    result[field] = value;
    return result;
  }, {});
}

function sanitizeStoredCommunityPost(post, topicIds, spaceIds) {
  if (!isRecord(post) || typeof post.id !== "string" || !post.id.startsWith("post_local_")) {
    return null;
  }

  const title = cleanText(post.title, inputLimits.communityTitle);
  const content = cleanText(post.content, inputLimits.communityContent);
  if (!title || !content || !topicIds.has(post.topic) || !spaceIds.has(post.space)) return null;

  const images = cleanStringList(post.images, null, 1).filter((image) =>
    image.startsWith("data:image/") && image.length <= inputLimits.communityImageData
  );
  const likes = Number.isFinite(post.likes) ? Math.max(0, Math.trunc(post.likes)) : 0;
  const comments = Number.isFinite(post.comments) ? Math.max(0, Math.trunc(post.comments)) : 0;
  const saves = Number.isFinite(post.saves) ? Math.max(0, Math.trunc(post.saves)) : 0;

  return {
    id: post.id.slice(0, 80),
    topic: post.topic,
    space: post.space,
    publishedAt: cleanText(post.publishedAt, 40),
    author: cleanText(post.author, 24) || "当前用户",
    role: cleanText(post.role, 24) || "家庭用户",
    location: cleanText(post.location, 30) || "本地社区",
    title,
    content,
    actions: cleanStringList(post.actions, null, 6).map((item) => item.slice(0, 30)),
    rescanStatus: cleanText(post.rescanStatus, 30) || "待复扫",
    likes,
    comments,
    saves,
    badge: cleanText(post.badge, 20) || "经验分享",
    images,
    imageAlts: images.length
      ? [cleanText(post.imageAlts?.[0], 80) || `${title}上传图片`]
      : []
  };
}

export function sanitizeSessionState(rawState, options = {}) {
  if (!isRecord(rawState)) return {};

  const entranceIds = new Set(options.entranceIds ?? ["scan", "mall", "community"]);
  const spaceIds = new Set(options.spaceIds ?? []);
  const topicIds = new Set(options.topicIds ?? []);
  const productIds = options.productIds ?? [];
  const taskIdsBySpace = options.taskIdsBySpace ?? {};
  const activeEntrance = entranceIds.has(rawState.activeEntrance) ? rawState.activeEntrance : "scan";
  const spaceId = spaceIds.has(rawState.spaceId) ? rawState.spaceId : "";
  const validTaskIds = spaceId ? (taskIdsBySpace[spaceId] ?? []) : [];
  const completedTasks = cleanStringList(rawState.completedTasks, validTaskIds, validTaskIds.length);
  const allTasksCompleted = Boolean(validTaskIds.length && completedTasks.length === validTaskIds.length);
  const planItemIds = cleanStringList(rawState.planItemIds, productIds, productIds.length);

  let maxUnlockedStep = clampInteger(rawState.maxUnlockedStep, 0, 6);
  if (!spaceId) maxUnlockedStep = Math.min(maxUnlockedStep, 1);
  if (spaceId && !allTasksCompleted) maxUnlockedStep = Math.min(Math.max(maxUnlockedStep, 2), 2);
  if (spaceId && allTasksCompleted) maxUnlockedStep = Math.max(maxUnlockedStep, 2);
  if (!planItemIds.length) maxUnlockedStep = Math.min(maxUnlockedStep, 5);

  const step = Math.min(clampInteger(rawState.step, 0, 6), maxUnlockedStep);
  const communityUserPosts = Array.isArray(rawState.communityUserPosts)
    ? rawState.communityUserPosts
      .map((post) => sanitizeStoredCommunityPost(post, topicIds, spaceIds))
      .filter(Boolean)
      .slice(0, 4)
    : [];

  return {
    activeEntrance,
    step,
    spaceId,
    completedTasks,
    elderProfile: sanitizeStoredProfile(rawState.elderProfile),
    planItemIds,
    planConfirmed: Boolean(rawState.planConfirmed && planItemIds.length),
    communityUserPosts,
    maxUnlockedStep
  };
}

export function resolvePublicAssetUrl(assetPath, baseUrl = "/") {
  if (typeof assetPath !== "string" || !assetPath.startsWith("/assets/")) {
    return assetPath;
  }

  const normalizedBase = `${baseUrl || "/"}`.replace(/\/*$/, "/");
  return `${normalizedBase}${assetPath.slice(1)}`;
}

export function loadSessionState(storage, key) {
  if (!storage?.getItem || !key) return {};

  try {
    const saved = storage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function saveSessionState(storage, key, state) {
  if (!storage?.setItem || !key) return false;

  try {
    storage.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function commitProfileDraft(draft = {}) {
  return {
    ...draft,
    age: String(draft.age || "75")
  };
}

export function isProfileComplete(profile = {}) {
  return [
    profile.mobility,
    profile.vision,
    profile.balance,
    profile.fallHistory,
    profile.night,
    profile.spaceUseFrequency
  ].every((value) => typeof value === "string" && value.trim() && value !== "待确认");
}

export function isCommunityPostDraftValid({ title, content, topic, space } = {}) {
  return Boolean(
    typeof title === "string" && title.trim() && title.trim().length <= inputLimits.communityTitle &&
    typeof content === "string" && content.trim() && content.trim().length <= inputLimits.communityContent &&
    typeof topic === "string" && topic && typeof space === "string" && space
  );
}

export function createCommunityPost(draft, options = {}) {
  if (!isCommunityPostDraftValid(draft)) return null;

  const {
    id = `post_local_${Date.now()}`,
    publishedAt = new Date().toISOString(),
    badge = "经验分享"
  } = options;
  const title = draft.title.trim().slice(0, inputLimits.communityTitle);
  const content = draft.content.trim().slice(0, inputLimits.communityContent);
  const imageData = typeof draft.imageData === "string" &&
    draft.imageData.startsWith("data:image/") &&
    draft.imageData.length <= inputLimits.communityImageData
    ? draft.imageData
    : "";

  return {
    id,
    topic: draft.topic,
    space: draft.space,
    publishedAt,
    author: "当前用户",
    role: "家庭用户",
    location: "本地社区",
    title,
    content,
    actions: ["待复扫", "待人工校核"],
    rescanStatus: "待复扫",
    likes: 0,
    comments: 0,
    saves: 0,
    badge,
    images: imageData ? [imageData] : [],
    imageAlts: imageData ? [`${title}上传图片`] : []
  };
}

export function getSpaceById(spaces, spaceId) {
  return spaces.find((space) => space.id === spaceId) ?? null;
}

export function getRisksBySpace(rules, spaceId) {
  return rules
    .filter((rule) => rule.space === spaceId)
    .sort((a, b) => levelWeight[b.level] - levelWeight[a.level]);
}

export function getProfileRiskWeight(risk, profile = {}) {
  const { exposure, vulnerability } = deriveProfileParameters(profile);
  if (!Number.isFinite(exposure) || !Number.isFinite(vulnerability)) return null;
  return { exposure, vulnerability, riskId: risk.id };
}

export function getPersonalizedRiskJudgements(risks, profile = {}) {
  const profileParameters = deriveProfileParameters(profile);
  return risks.map((risk) => {
    const reasons = [];

    if (/视物|视力|起夜|夜间/.test(`${profile.vision} ${profile.night}`) && /照明|暗区|门槛|高差/.test(`${risk.name} ${risk.rule}`)) {
      reasons.push("视力或夜间活动情况会放大暗区与高差识别难度");
    }
    if (/助行器|轮椅|手杖|陪同|辅助/.test(`${profile.mobility} ${profile.assistance}`) && /通道|通行|门槛|高差|转身/.test(`${risk.name} ${risk.rule}`)) {
      reasons.push("辅具或陪同需求提高了连续通行与转身空间要求");
    }
    if (/起身|膝|支撑|握力|抓握|借力/.test(`${profile.mobility} ${profile.grip} ${profile.notes}`) && /起身|支撑|扶手|取物/.test(`${risk.name} ${risk.rule}`)) {
      reasons.push("起身或抓握支撑能力使稳定借力点更重要");
    }
    if (!reasons.length) reasons.push("当前优先级主要由空间风险等级与使用频率决定");

    return {
      riskId: risk.id,
      baseLevel: risk.level,
      personalizedLevel: risk.level,
      exposure: profileParameters.exposure,
      vulnerability: profileParameters.vulnerability,
      reasons
    };
  });
}

export function buildHumanFactorAssessment(profile = {}, risks = [], assessment = null) {
  const individualFactors = [
    { id: "mobility", label: "行动能力", value: profile.mobility || "待确认" },
    { id: "vision", label: "视力情况", value: profile.vision || "待确认" },
    { id: "balance", label: "平衡状态", value: profile.balance || "待确认" },
    { id: "fallHistory", label: "跌倒史", value: profile.fallHistory || "待确认" }
  ];
  const spatialDefinitions = [
    { id: "threshold", label: "门槛高差", pattern: /门槛|高差|轨道/ },
    { id: "passage", label: "通道空间", pattern: /通道|通行|转身/ },
    { id: "lighting", label: "照明暗区", pattern: /照明|暗区|视物/ },
    { id: "support", label: "扶手支撑", pattern: /扶手|支撑|起身/ },
    { id: "slippery", label: "地面湿滑", pattern: /湿滑|反光|积水|防滑/ }
  ];
  const spatialFactors = spatialDefinitions.map((definition) => {
    const matchedRisk = risks.find((risk) =>
      definition.pattern.test(`${risk.name} ${risk.riskType} ${risk.rule}`)
    );
    return {
      id: definition.id,
      label: definition.label,
      status: matchedRisk ? "已识别风险" : "本次未识别",
      riskName: matchedRisk?.name ?? ""
    };
  });

  return {
    individualFactors,
    spatialFactors,
    riskJudgements: getPersonalizedRiskJudgements(risks, profile),
    parameters: assessment?.parameters ?? {
      E: deriveProfileParameters(profile).exposure,
      V: deriveProfileParameters(profile).vulnerability
    },
    isPrototype: true
  };
}

export function prioritizeRisksForProfile(risks, profile = {}) {
  void profile;
  return [...risks].sort((a, b) => levelWeight[b.level] - levelWeight[a.level]);
}

export function isProductRecommendedForRisk(risk, product) {
  return risk.recommendedProductIds.includes(product.id);
}

export function getRecommendedRisksForProduct(risks, product) {
  return risks.filter((risk) => isProductRecommendedForRisk(risk, product));
}

export function matchProductsForRisks(risks, products) {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const matched = [];

  risks.forEach((risk) => {
    risk.recommendedProductIds.forEach((productId) => {
      const product = productsById.get(productId);
      if (product && !matched.includes(product)) matched.push(product);
    });
  });

  return matched;
}

export function selectInitialPlanProducts(matchedProducts, risks, limit = 3) {
  const selected = [];
  const matchedById = new Map(matchedProducts.map((product) => [product.id, product]));

  for (const risk of risks) {
    if (selected.length >= limit) break;
    const candidate = risk.recommendedProductIds
      .map((productId) => matchedById.get(productId))
      .find((product) => product && !selected.includes(product));
    if (candidate) selected.push(candidate);
  }

  return selected;
}

export function estimateBudgetRange(matchedProducts) {
  if (!matchedProducts.length) {
    return { min: 0, max: 0 };
  }

  return matchedProducts.reduce(
    (range, product) => ({
      min: range.min + product.budgetMin,
      max: range.max + product.budgetMax
    }),
    { min: 0, max: 0 }
  );
}

export function getManualReviewItems(risks, matchedProducts) {
  const riskItems = risks.filter((risk) => risk.requiresReview).map((risk) => risk.name);
  const serviceItems = matchedProducts
    .filter((product) => product.requiresReview)
    .map((product) => product.name);

  return Array.from(new Set([...riskItems, ...serviceItems]));
}

export function buildReport({ space, risks, products, assessment, solutionRouting }) {
  const budget = estimateBudgetRange(products);
  const highPriority = risks.filter((risk) => levelWeight[risk.level] >= 3);
  const reviewItems = Array.from(new Set([
    ...(assessment?.reviewReasons ?? assessment?.reasons ?? []),
    ...getManualReviewItems(risks, products),
    ...(solutionRouting?.reviewTasks ?? []).map((task) => task.triggerDetail)
  ])).filter(Boolean);
  const formalInput = isFormalPublishedAssessment(assessment);
  const safetyDisplay = buildSafetyDisplayView(assessment);

  return {
    title: `${space.name}适老风险评估报告`,
    assessment,
    internalRiskValue: formatRiskValue(assessment),
    safetyDisplay,
    safetyValue: formatSafetyDisplayValue(safetyDisplay),
    riskTier: assessment?.riskTier ?? "待复核",
    resultKindLabel: getResultKindLabel(assessment),
    formalInput,
    levelKey: assessment?.riskTier === "高"
      ? "risk-high"
      : assessment?.riskTier === "中高"
        ? "risk-medium-high"
        : assessment?.riskTier === "中"
          ? "risk-medium"
          : assessment?.riskTier === "低"
            ? "risk-low"
            : "risk-review",
    highPriority,
    budget,
    reviewItems,
    demoCandidateCount: solutionRouting?.demoCandidates?.length ?? 0,
    reviewTaskCount: solutionRouting?.reviewTasks?.length ?? 0,
    summary: formalInput
      ? "本次根据采集画面和已确认的老人情况生成结果。安全分由当前评估结果换算，数值越高越安全；改造效果需在执行后复扫确认，实际方案仍需现场确认。"
      : "当前信息不足或存在冲突，需要补充采集或人工复核。系统不会把缺失信息默认成低风险，也不会直接生成可选方案。"
  };
}

export function getCaseBySpace(sampleCases, spaceId) {
  return sampleCases.find((caseItem) => caseItem.space === spaceId) ?? null;
}

export function canConfirmPlan(planItemIds) {
  return Array.isArray(planItemIds) && planItemIds.length > 0;
}

export {
  buildSafetyDisplayView,
  buildRescanSafetyComparison,
  buildPlanSafetyProjection,
  buildPostReviewSafetyProjection,
  buildSolutionRouting,
  calculatePatentRiskAssessment,
  calculatePatentRiskValue,
  calculatePlanCoverage,
  convertRiskValueToSafety,
  demoConstraintFixtures,
  demoP2MappingRules,
  deriveProfileParameters,
  formatSafetyDisplayValue,
  isFormalPublishedAssessment,
  patentBaseline,
  validateTraceIntegrity
};
