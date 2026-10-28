export const patentBaseline = {
  sourceCommit: "00677a0280ad08d496ac3a5a00238f9ef44ebc8b",
  a7ImplementationCommit: "372f34f",
  p2SourceCommit: "65aa0989e791142c77aa21cbd3d262e96f544e84",
  displayVersion: "P1-DISPLAY-1.0",
  contractVersion: "P1-P2-CONTRACT-DRAFT-0.9",
  schemaVersion: "P1-SCHEMA-1.6",
  ruleVersion: "P1-RULE-1.1",
  derivationVersion: "P1-DERIVE-1.2",
  calculationVersion: "P1-CALC-1.0",
  gateVersion: "P1-GATE-1.1",
  registryVersion: "P1-REGISTRY-1.0",
  adapterVersion: "DEMO-P2-ADAPTER-0.1",
  supportedSpaces: ["bathroom", "bedroom", "corridor"]
};

const mobilityValues = {
  "正常行走": 0,
  "独立行走": 0,
  "使用手杖": 0.35,
  "使用助行器": 0.55,
  "轮椅辅助": 0.65,
  "需他人协助": 0.8
};

const visionValues = {
  "日常视物正常": 0,
  "弱光下视物困难": 0.6,
  "视力明显受限": 0.6
};

const balanceValues = {
  "平衡能力正常": 0,
  "平衡能力受限": 0.8
};

const fallHistoryValues = {
  "未报告跌倒": 0,
  "有跌倒经历": 1
};

const nightFrequencyValues = {
  "很少起夜": 0,
  "偶尔起夜": 1,
  "起夜频繁": 2,
  "夜间需照护": 3
};

const frozenSyntheticCases = {
  bathroom: {
    fixtureId: "E01",
    assessmentId: "asmt_bathroom_001",
    spaceRef: "space_bathroom",
    riskResultId: "result_bathroom_001",
    traceRecordRef: "trace_bathroom_001",
    riskId: "risk_bathroom_slip",
    riskName: "卫生间地面湿滑风险",
    triggerDegree: 0.8,
    severity: 0.7,
    spatialCoefficient: 1.2,
    evidenceCompleteness: 1,
    evidenceState: "complete",
    requiredEvidenceClosed: true,
    criticalConflicts: [],
    highRiskConstruction: false,
    observations: ["地面湿润", "门槛高度 22 mm", "通道净宽 760 mm"],
    evidenceRefs: ["ev_floor", "ev_route", "ev_threshold"],
    calculatedAt: "2026-07-24T18:00:00+08:00"
  },
  bedroom: {
    fixtureId: "E02",
    assessmentId: "asmt_bedroom_001",
    spaceRef: "space_bedroom",
    riskResultId: "result_bedroom_001",
    traceRecordRef: "trace_bedroom_001",
    riskId: "risk_bedroom_night_fall",
    riskName: "卧室夜间动线跌倒风险",
    triggerDegree: 0.55,
    severity: 0.65,
    spatialCoefficient: 0.95,
    evidenceCompleteness: 0.5,
    evidenceState: "partial",
    requiredEvidenceClosed: false,
    criticalConflicts: [],
    highRiskConstruction: false,
    reasonCodes: ["MISSING_CRITICAL_EVIDENCE", "MISSING_REQUIRED_EVIDENCE"],
    reasonSourceRefs: [
      "capture_ev_night_light",
      "reqset_bedroom_001",
      "risk_bedroom_night_fall@P1-RULE-1.1"
    ],
    observations: ["通道净宽 900 mm", "夜间照度证据缺失"]
  },
  corridor: {
    fixtureId: "E03",
    assessmentId: "asmt_corridor_001",
    spaceRef: "space_corridor",
    riskResultId: "result_corridor_001",
    traceRecordRef: "trace_corridor_001",
    riskId: "risk_corridor_passage",
    riskName: "玄关通道通行风险",
    triggerDegree: 0.7,
    severity: 0.6,
    spatialCoefficient: 1.05,
    evidenceCompleteness: 1,
    evidenceState: "conflicting",
    requiredEvidenceClosed: true,
    criticalConflicts: ["route.width_mm: 780 mm / 830 mm"],
    highRiskConstruction: false,
    reasonCodes: ["CONFLICTING_MEASUREMENT"],
    reasonSourceRefs: ["conflict_7db302e7ba86"],
    observations: ["通道净宽出现 780 mm 与 830 mm 两组冲突测量"]
  }
};

function canonicalStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalStringify(item)).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalStringify(value[key])}`
  )).join(",")}}`;
}

function sha256Hex(message) {
  const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount));
  const words = [];
  const ascii = unescape(encodeURIComponent(message));
  const bitLength = ascii.length * 8;
  const hash = [];
  const constants = [];
  const composite = {};
  let primeCounter = 0;

  for (let candidate = 2; primeCounter < 64; candidate += 1) {
    if (composite[candidate]) continue;
    for (let multiple = candidate * candidate; multiple < 313; multiple += candidate) composite[multiple] = true;
    if (primeCounter < 8) hash[primeCounter] = (Math.pow(candidate, 0.5) * 0x100000000) | 0;
    constants[primeCounter] = (Math.pow(candidate, 1 / 3) * 0x100000000) | 0;
    primeCounter += 1;
  }

  let padded = `${ascii}\x80`;
  while ((padded.length % 64) !== 56) padded += "\x00";
  for (let index = 0; index < padded.length; index += 1) {
    words[index >> 2] |= padded.charCodeAt(index) << ((3 - index) % 4) * 8;
  }
  words.push(Math.floor(bitLength / 0x100000000));
  words.push(bitLength);

  for (let offset = 0; offset < words.length; offset += 16) {
    const schedule = words.slice(offset, offset + 16);
    const oldHash = hash.slice(0);
    for (let round = 0; round < 64; round += 1) {
      const w15 = schedule[round - 15];
      const w2 = schedule[round - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + constants[round]
        + (schedule[round] = round < 16 ? schedule[round] : (
          schedule[round - 16]
          + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
          + schedule[round - 7]
          + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
        ) | 0);
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash.pop();
      hash.unshift((temp1 + temp2) | 0);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (let index = 0; index < 8; index += 1) hash[index] = (hash[index] + oldHash[index]) | 0;
  }
  return hash.map((value) => (`00000000${(value >>> 0).toString(16)}`).slice(-8)).join("");
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function buildParameterContributions(parameters) {
  const definitions = {
    T: { sourceRefs: ["ev_floor", "obs_floor_slip"], ruleRef: "trigger_floor_slip@P1-RULE-1.1" },
    S: { sourceRefs: ["basis_fall_injury_v1"], ruleRef: "risk_bathroom_slip@P1-RULE-1.1" },
    E: { sourceRefs: ["profile_bathroom"], ruleRef: "exposure_mapping@P1-DERIVE-1.2" },
    V: { sourceRefs: ["profile_bathroom"], ruleRef: "vulnerability_mapping@P1-DERIVE-1.2" },
    K: { sourceRefs: ["obs_floor_slip", "obs_route", "obs_threshold", "space_bathroom"], ruleRef: "spatial_mapping@P1-DERIVE-1.2" },
    C: { sourceRefs: ["ev_floor", "ev_route", "ev_threshold"], ruleRef: "completeness_mapping@P1-DERIVE-1.2" }
  };
  return Object.entries(parameters).map(([parameter, value]) => ({
    derivationId: `derivation_${parameter}`,
    parameter,
    value,
    sourceRefs: definitions[parameter].sourceRefs,
    ruleRef: definitions[parameter].ruleRef
  }));
}

function buildTracePayload(assessment) {
  return {
    fixtureId: assessment.fixtureId,
    riskResultId: assessment.riskResultId,
    assessmentId: assessment.assessmentId,
    spaceRef: assessment.spaceRef,
    sourceSpaceType: assessment.sourceSpaceType,
    riskId: assessment.riskId,
    evidenceRefs: assessment.evidenceRefs,
    parameters: assessment.parameters,
    parameterContributions: assessment.parameterContributions,
    calculationSteps: assessment.calculationSteps,
    rawRisk: assessment.rawRisk,
    riskValueOrInterval: assessment.riskValueOrInterval,
    riskTier: assessment.riskTier,
    evidenceState: assessment.evidenceState,
    reviewFlag: assessment.reviewFlag,
    reviewReasonCodes: assessment.reviewReasonCodes,
    resultState: assessment.resultState,
    gateDecisionRecord: assessment.gateDecisionRecord,
    observations: assessment.observations,
    calculatedAt: assessment.calculatedAt,
    versions: assessment.versions,
    synthetic: assessment.synthetic
  };
}

const frozenE01TracePayload = deepFreeze({
  fixtureId: "E01",
  riskResultId: "result_bathroom_001",
  assessmentId: "asmt_bathroom_001",
  spaceRef: "space_bathroom",
  sourceSpaceType: "bathroom",
  riskId: "risk_bathroom_slip",
  evidenceRefs: ["ev_floor", "ev_route", "ev_threshold"],
  parameters: { T: 0.8, S: 0.7, E: 0.5, V: 0.6875, K: 1.2, C: 1 },
  parameterContributions: buildParameterContributions({ T: 0.8, S: 0.7, E: 0.5, V: 0.6875, K: 1.2, C: 1 }),
  calculationSteps: { base: 56, exposureFactor: 0.8, vulnerabilityFactor: 0.90625 },
  rawRisk: 48.72,
  riskValueOrInterval: { kind: "point", value: 49 },
  riskTier: "中",
  evidenceState: "complete",
  reviewFlag: false,
  reviewReasonCodes: [],
  resultState: "published",
  gateDecisionRecord: { primaryReasonCode: null, reasonCodes: [], forcedReviewOnly: false },
  observations: ["地面湿润", "门槛高度 22 mm", "通道净宽 760 mm"],
  calculatedAt: "2026-07-24T18:00:00+08:00",
  versions: patentBaseline,
  synthetic: true
});

const e01PayloadHash = `sha256:${sha256Hex(canonicalStringify(frozenE01TracePayload))}`;
const frozenTraceFixtures = deepFreeze({
  E01: {
    traceRecordRef: "trace_bathroom_001",
    riskResultRef: "result_bathroom_001",
    sourceFixtureRef: "P1:E01-published-risk-result.json",
    payloadHash: e01PayloadHash
  }
});

export const demoP2MappingRules = [
  {
    sourceRiskId: "risk_bathroom_slip",
    sourceRiskTier: "中",
    sourceSpaceType: "bathroom",
    actionId: "demo_action_antislip_coating",
    actionName: "防滑涂层处理",
    productId: "anti_slip_coating",
    displayRiskRuleId: "slippery_floor",
    mappingRuleRef: "P2-R011-draft",
    authority: "demo_adapter_only",
    requiredConstraintIds: ["floor_material_compatibility"]
  }
];

export const demoConstraintFixtures = {
  E01: {
    demo_action_antislip_coating: {
      sourceRiskId: "risk_bathroom_slip",
      sourceRiskTier: "中",
      sourceSpaceType: "bathroom",
      actionId: "demo_action_antislip_coating",
      synthetic: true,
      verified: false,
      sourceRef: "DEMO-P2-CONSTRAINT-FIXTURE:E01:anti_slip_coating",
      constraintBasis: "synthetic_fixture",
      realWorldInstallationStatus: "unknown",
      checks: [
        {
          constraintId: "floor_material_compatibility",
          status: "pass",
          actualValue: "ceramic_tile",
          requiredValue: "compatible_wet_area_surface",
          unit: null,
          sourceRefs: ["DEMO-P2-CONSTRAINT-FIXTURE:E01"]
        },
      ],
      budget: {
        materialMin: 80,
        materialMax: 150,
        laborMin: null,
        laborMax: null,
        currency: "CNY",
        sourceRef: "demo_catalog_fixed:E01:demo_action_antislip_coating",
        synthetic: true,
        verified: false
      }
    }
  }
};

const reviewReasonText = {
  MISSING_CRITICAL_EVIDENCE: "关键证据缺失，需补采后重新评估",
  MISSING_REQUIRED_EVIDENCE: "缺少本次评估所需画面或信息",
  CONFLICTING_MEASUREMENT: "关键测量存在冲突，不能取平均值或单一值",
  LOW_CAPTURE_QUALITY: "采集质量未通过，需要补拍或人工补录",
  PROFILE_INCOMPLETE: "老人画像关键项未确认，不能默认低风险",
  TRACE_INTEGRITY_INVALID: "评估记录校验未通过，需要重新生成或人工复核",
  HIGH_RISK_CONSTRUCTION: "涉及高风险施工，需要专业人员复核",
  UNSUPPORTED_SPACE_TYPE: "当前空间需要补充信息，已转交专业人员复核"
};

function round6(value) {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function assertPatentParameter(name, value, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be within ${min}-${max}`);
  }
}

export function calculatePatentRiskValue(parameters) {
  assertPatentParameter("T", parameters?.T, 0, 1);
  assertPatentParameter("S", parameters?.S, 0, 1);
  assertPatentParameter("E", parameters?.E, 0, 1);
  assertPatentParameter("V", parameters?.V, 0, 1);
  assertPatentParameter("K", parameters?.K, 0.8, 1.2);
  assertPatentParameter("C", parameters?.C, 0, 1);

  const base = round6(100 * parameters.T * parameters.S);
  const exposureFactor = round6(0.6 + 0.4 * parameters.E);
  const vulnerabilityFactor = round6(0.7 + 0.3 * parameters.V);
  const rawRisk = round6(clamp(
    base * exposureFactor * vulnerabilityFactor * parameters.K,
    0,
    100
  ));
  const point = Math.round(rawRisk);

  return {
    rawRisk,
    riskValueOrInterval: { kind: "point", value: point },
    riskTier: mapRiskTier(point),
    calculationSteps: { base, exposureFactor, vulnerabilityFactor }
  };
}

function parseFrequency(value) {
  if (Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value ?? "").match(/[\d.]+/)?.[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function deriveProfileParameters(profile = {}) {
  const mobility = mobilityValues[profile.mobility];
  const vision = visionValues[profile.vision];
  const balance = balanceValues[profile.balance];
  const fallHistory = fallHistoryValues[profile.fallHistory];
  const nightFrequency = nightFrequencyValues[profile.night];
  const spaceUseFrequency = parseFrequency(profile.spaceUseFrequency);
  const values = [mobility, vision, balance, fallHistory];
  const vulnerability = values.every(Number.isFinite)
    ? round6(values.reduce((total, value) => total + value, 0) / values.length)
    : null;
  const exposure = Number.isFinite(nightFrequency) && Number.isFinite(spaceUseFrequency)
    ? round6(Math.max(
        clamp(nightFrequency / 4, 0, 1),
        clamp(spaceUseFrequency / 8, 0, 1)
      ))
    : null;

  return {
    exposure,
    vulnerability,
    profileState: exposure === null || vulnerability === null ? "partial" : "complete",
    components: {
      mobility,
      vision,
      balance,
      fallHistory,
      nightFrequency,
      spaceUseFrequency
    }
  };
}

export function mapRiskTier(value) {
  if (!Number.isFinite(value)) return "待复核";
  if (value < 25) return "低";
  if (value < 50) return "中";
  if (value < 75) return "中高";
  return "高";
}

function buildReviewHandoff({ spaceId, syntheticCase, reasons }) {
  const reasonCodes = [...new Set(reasons)];
  if (!syntheticCase) return buildUnsupportedSpaceReviewTask({ spaceId, reasonCodes });
  return {
    viewType: "ReviewHandoff",
    handoffId: `handoff_${syntheticCase.riskResultId}`,
    assessmentId: syntheticCase.assessmentId,
    spaceId: syntheticCase.spaceRef,
    sourceSpaceType: spaceId,
    riskRef: syntheticCase.riskId,
    riskResultRef: syntheticCase.riskResultId,
    traceRecordRef: syntheticCase.traceRecordRef,
    reviewRequired: true,
    sourceFixtureRef: `P1:${syntheticCase.fixtureId}`,
    supportedSpace: true,
    registryStatus: "registered",
    riskName: syntheticCase.riskName,
    evidenceState: syntheticCase.evidenceState,
    reasonCodes,
    reasonSourceRefs: syntheticCase.reasonSourceRefs ?? [syntheticCase.traceRecordRef],
    reasons: reasonCodes.map((code) => reviewReasonText[code] ?? "需要人工复核"),
    supplementalActions: reasonCodes.map((code) => ({
      reasonCode: code,
      action: code === "CONFLICTING_MEASUREMENT" ? "重新测量并消解冲突" : "补充采集或人工确认"
    })),
    versions: patentBaseline,
    schemaVersion: patentBaseline.schemaVersion,
    ruleVersion: patentBaseline.ruleVersion,
    gateVersion: patentBaseline.gateVersion,
    contractVersion: patentBaseline.contractVersion,
    synthetic: true
  };
}

function buildUnsupportedSpaceReviewTask({ spaceId, reasonCodes }) {
  return {
    viewType: "UnsupportedSpaceReviewTask",
    reviewTaskId: `unsupported_${spaceId}`,
    sourceSpaceType: spaceId,
    supportedSpace: false,
    registryStatus: "not_in_registry",
    reviewRequired: true,
    evidenceState: "unavailable",
    reasonCodes,
    reasons: reasonCodes.map((code) => reviewReasonText[code] ?? "需要人工复核"),
    supplementalActions: [{
      reasonCode: "UNSUPPORTED_SPACE_TYPE",
      action: "由专业人员确认空间类型与采集要求"
    }],
    versions: patentBaseline,
    synthetic: true
  };
}

export function calculatePatentRiskAssessment({ spaceId, profile = {} }) {
  const syntheticCase = frozenSyntheticCases[spaceId];
  const profileParameters = deriveProfileParameters(profile);

  if (!syntheticCase) {
    return buildReviewHandoff({
      spaceId,
      syntheticCase: null,
      reasons: ["UNSUPPORTED_SPACE_TYPE"]
    });
  }

  const parameters = {
    T: syntheticCase.triggerDegree,
    S: syntheticCase.severity,
    E: profileParameters.exposure,
    V: profileParameters.vulnerability,
    K: syntheticCase.spatialCoefficient,
    C: syntheticCase.evidenceCompleteness
  };
  const missingParameter = Object.entries(parameters).find(([, value]) => !Number.isFinite(value));

  if (missingParameter) {
    return buildReviewHandoff({
      spaceId,
      syntheticCase,
      reasons: ["PROFILE_INCOMPLETE", ...(syntheticCase.reasonCodes ?? [])]
    });
  }

  const calculation = calculatePatentRiskValue(parameters);
  const { rawRisk, calculationSteps } = calculation;
  const blockingReasons = [];
  if (!syntheticCase.requiredEvidenceClosed) blockingReasons.push(...(syntheticCase.reasonCodes ?? ["MISSING_REQUIRED_EVIDENCE"]));
  if (syntheticCase.criticalConflicts.length) blockingReasons.push("CONFLICTING_MEASUREMENT");
  if (parameters.C < 0.5) blockingReasons.push("MISSING_CRITICAL_EVIDENCE");

  if (blockingReasons.length) {
    return buildReviewHandoff({
      spaceId,
      syntheticCase,
      reasons: blockingReasons
    });
  }

  let riskValueOrInterval;
  let riskTier;
  let reviewFlag = false;
  let reviewReasonCodes = [];

  if (parameters.C < 0.8) {
    riskValueOrInterval = {
      kind: "interval",
      min: Math.round(rawRisk * parameters.C),
      max: Math.round(Math.min(100, rawRisk + (1 - parameters.C) * parameters.S * 30))
    };
    riskTier = "待复核";
    reviewFlag = true;
    reviewReasonCodes = ["MISSING_REQUIRED_EVIDENCE"];
  } else {
    riskValueOrInterval = calculation.riskValueOrInterval;
    riskTier = calculation.riskTier;
  }

  if (syntheticCase.highRiskConstruction) {
    reviewFlag = true;
    reviewReasonCodes.push("HIGH_RISK_CONSTRUCTION");
  }

  const publishedResult = {
    viewType: "PublishedRiskResult",
    fixtureId: syntheticCase.fixtureId,
    assessmentId: syntheticCase.assessmentId,
    spaceRef: syntheticCase.spaceRef,
    supportedSpace: true,
    registryStatus: "registered",
    sourceSpaceType: spaceId,
    riskResultId: syntheticCase.riskResultId,
    riskId: syntheticCase.riskId,
    riskName: syntheticCase.riskName,
    evidenceRefs: syntheticCase.evidenceRefs,
    parameters,
    parameterContributions: buildParameterContributions(parameters),
    calculationSteps,
    rawRisk,
    riskValueOrInterval,
    riskTier,
    evidenceState: syntheticCase.evidenceState,
    reviewFlag,
    reviewReasonCodes,
    reviewReasons: reviewReasonCodes.map((code) => reviewReasonText[code]),
    resultState: reviewFlag ? "review_required" : "published",
    gateDecisionRecord: {
      primaryReasonCode: reviewReasonCodes[0] ?? null,
      reasonCodes: [...reviewReasonCodes],
      forcedReviewOnly: reviewFlag
    },
    observations: syntheticCase.observations,
    calculatedAt: syntheticCase.calculatedAt,
    versions: patentBaseline,
    synthetic: true
  };
  const traceFixture = frozenTraceFixtures[syntheticCase.fixtureId];
  publishedResult.traceRecord = traceFixture
    ? deepFreeze(structuredClone(traceFixture))
    : null;
  const traceIntegrityState = validateTraceIntegrity(publishedResult) ? "valid" : "invalid";
  if (traceIntegrityState !== "valid") {
    return buildReviewHandoff({
      spaceId,
      syntheticCase,
      reasons: ["TRACE_INTEGRITY_INVALID"]
    });
  }
  return {
    ...publishedResult,
    traceIntegrityState
  };
}

export function validateTraceIntegrity(assessment) {
  const trace = assessment?.traceRecord;
  const frozenTrace = frozenTraceFixtures[assessment?.fixtureId];
  const actualHash = assessment
    ? `sha256:${sha256Hex(canonicalStringify(buildTracePayload(assessment)))}`
    : null;
  return Boolean(
    assessment?.viewType === "PublishedRiskResult" &&
    frozenTrace &&
    trace &&
    trace.traceRecordRef === frozenTrace.traceRecordRef &&
    trace.sourceFixtureRef === frozenTrace.sourceFixtureRef &&
    trace.riskResultRef === assessment.riskResultId &&
    /^sha256:[0-9a-f]{64}$/.test(trace.payloadHash ?? "") &&
    trace.payloadHash === frozenTrace.payloadHash &&
    trace.payloadHash === actualHash
  );
}

export function isFormalPublishedAssessment(assessment) {
  return Boolean(
    assessment &&
    assessment.traceIntegrityState === "valid" &&
    validateTraceIntegrity(assessment) &&
    assessment.resultState === "published" &&
    assessment.reviewFlag === false &&
    assessment.riskValueOrInterval?.kind === "point"
  );
}

export function formatRiskValue(assessment) {
  const value = assessment?.riskValueOrInterval;
  if (value?.kind === "point") return String(value.value);
  if (value?.kind === "interval") return `${value.min}-${value.max}`;
  return "待复核";
}

export function convertRiskValueToSafety(riskValueOrInterval) {
  if (riskValueOrInterval?.kind === "point") {
    const { value } = riskValueOrInterval;
    if (!Number.isFinite(value) || value < 0 || value > 100) return null;
    return { kind: "point", value: 100 - value };
  }

  if (riskValueOrInterval?.kind === "interval") {
    const { min, max } = riskValueOrInterval;
    if (
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min < 0 ||
      max > 100 ||
      min > max
    ) return null;
    return { kind: "interval", min: 100 - max, max: 100 - min };
  }

  return null;
}

function buildBathroomRescanSnapshot(profileParameters, snapshot) {
  if (
    snapshot?.resultState !== "published" ||
    snapshot?.traceIntegrityState !== "valid" ||
    snapshot?.evidenceState !== "complete" ||
    typeof snapshot?.floorWet !== "boolean" ||
    !Number.isFinite(snapshot?.thresholdHeightMm) ||
    !Number.isFinite(snapshot?.routeWidthMm)
  ) return null;

  const spatialCoefficient = clamp(
    1.1
      + (snapshot.thresholdHeightMm >= 20 ? 0.05 : 0)
      + (snapshot.routeWidthMm < 800 ? 0.05 : 0)
      + (snapshot.floorWet ? 0.05 : 0),
    0.8,
    1.2
  );
  const parameters = {
    T: snapshot.floorWet ? 0.8 : 0.2,
    S: 0.7,
    E: profileParameters.exposure,
    V: profileParameters.vulnerability,
    K: round6(spatialCoefficient),
    C: 1
  };
  const risk = calculatePatentRiskValue(parameters);
  const safety = convertRiskValueToSafety(risk.riskValueOrInterval);
  if (safety?.kind !== "point") return null;

  return {
    safety: safety.value,
    risk: risk.riskValueOrInterval.value,
    riskTier: risk.riskTier,
    parameters,
    rawRisk: risk.rawRisk
  };
}

export function buildRescanSafetyComparison({ spaceId, profile, before, after }) {
  if (spaceId !== "bathroom") return null;
  const profileParameters = deriveProfileParameters(profile);
  if (profileParameters.profileState !== "complete") return null;

  const beforeResult = buildBathroomRescanSnapshot(profileParameters, before);
  const afterResult = buildBathroomRescanSnapshot(profileParameters, after);
  if (!beforeResult || !afterResult || afterResult.safety <= beforeResult.safety) return null;

  return {
    before: beforeResult.safety,
    after: afterResult.safety,
    beforeRisk: beforeResult.risk,
    afterRisk: afterResult.risk,
    scoreDirection: "higher_is_safer",
    calculationVersion: patentBaseline.calculationVersion,
    displayVersion: patentBaseline.displayVersion,
    readOnly: true
  };
}

export function buildPlanSafetyProjection({ assessment, profile, actionIds = [] }) {
  if (
    !isFormalPublishedAssessment(assessment) ||
    assessment.fixtureId !== "E01" ||
    !actionIds.includes("demo_action_antislip_coating")
  ) return null;

  const comparison = buildRescanSafetyComparison({
    spaceId: "bathroom",
    profile,
    before: {
      resultState: "published",
      traceIntegrityState: "valid",
      evidenceState: "complete",
      floorWet: true,
      thresholdHeightMm: 22,
      routeWidthMm: 760
    },
    after: {
      resultState: "published",
      traceIntegrityState: "valid",
      evidenceState: "complete",
      floorWet: false,
      thresholdHeightMm: 22,
      routeWidthMm: 760
    }
  });

  return comparison ? {
    ...comparison,
    projectionState: "plan_estimate",
    requiresRescanConfirmation: true
  } : null;
}

const reviewedSpaceProjectionRules = {
  bedroom: {
    before: { T: 0.55, S: 0.65, K: 0.95 },
    after: { T: 0.24, S: 0.65, K: 0.9 },
    reviewBasis: ["夜间起身动线已补充", "床侧通道与照明覆盖已确认"]
  },
  corridor: {
    before: { T: 0.7, S: 0.6, K: 1.05 },
    after: { T: 0.25, S: 0.6, K: 0.92 },
    reviewBasis: ["通道净宽已重新测量", "门槛与地面障碍已核对"]
  }
};

export function buildPostReviewSafetyProjection({ spaceId, profile }) {
  const rule = reviewedSpaceProjectionRules[spaceId];
  const profileParameters = deriveProfileParameters(profile);
  if (!rule || profileParameters.profileState !== "complete") return null;

  const buildResult = (spatial) => {
    const parameters = {
      T: spatial.T,
      S: spatial.S,
      E: profileParameters.exposure,
      V: profileParameters.vulnerability,
      K: spatial.K,
      C: 1
    };
    const riskResult = calculatePatentRiskValue(parameters);
    const safetyResult = convertRiskValueToSafety(riskResult.riskValueOrInterval);
    if (safetyResult?.kind !== "point") return null;
    return {
      safety: safetyResult.value,
      risk: riskResult.riskValueOrInterval.value,
      riskTier: riskResult.riskTier,
      parameters
    };
  };

  const before = buildResult(rule.before);
  const after = buildResult(rule.after);
  if (!before || !after || after.safety <= before.safety) return null;

  return {
    before: before.safety,
    after: after.safety,
    beforeRisk: before.risk,
    afterRisk: after.risk,
    riskTier: before.riskTier,
    afterRiskTier: after.riskTier,
    reviewBasis: [...rule.reviewBasis],
    scoreDirection: "higher_is_safer",
    calculationVersion: patentBaseline.calculationVersion,
    displayVersion: patentBaseline.displayVersion,
    projectionState: "post_review_plan_estimate",
    reviewState: "completed",
    requiresRescanConfirmation: true,
    readOnly: true
  };
}

export function buildSafetyDisplayView(sourceView) {
  if (!sourceView || sourceView.viewType === "UnsupportedSpaceReviewTask") return null;

  const sourceCommit = sourceView.versions?.sourceCommit;
  const displayBase = {
    viewType: "SafetyDisplayView",
    displayVersion: patentBaseline.displayVersion,
    sourceViewType: sourceView.viewType,
    sourceCommit,
    assessmentId: sourceView.assessmentId,
    spaceId: sourceView.spaceRef ?? sourceView.spaceId,
    riskId: sourceView.riskId ?? sourceView.riskRef,
    riskResultRef: sourceView.riskResultId ?? sourceView.riskResultRef,
    scoreDirection: "higher_is_safer",
    readOnly: true
  };
  const hasRequiredReferences = Boolean(
    displayBase.sourceCommit &&
    displayBase.assessmentId &&
    displayBase.spaceId &&
    displayBase.riskId &&
    displayBase.riskResultRef
  );

  if (sourceView.viewType === "ReviewHandoff") {
    if (!sourceView.reviewRequired || !hasRequiredReferences) return null;
    return {
      ...displayBase,
      safetyValueOrInterval: { kind: "review_only" }
    };
  }

  if (
    sourceView.viewType !== "PublishedRiskResult" ||
    sourceView.resultState !== "published" ||
    sourceView.traceIntegrityState !== "valid" ||
    !validateTraceIntegrity(sourceView) ||
    !hasRequiredReferences
  ) return null;

  const safetyValueOrInterval = convertRiskValueToSafety(sourceView.riskValueOrInterval);
  if (!safetyValueOrInterval) return null;

  return {
    ...displayBase,
    safetyValueOrInterval
  };
}

export function formatSafetyDisplayValue(safetyDisplayView) {
  const value = safetyDisplayView?.safetyValueOrInterval;
  if (value?.kind === "point") return String(value.value);
  if (value?.kind === "interval") return `${value.min}-${value.max}`;
  return "待复核";
}

export function getResultKindLabel(assessment) {
  const kind = assessment?.riskValueOrInterval?.kind;
  if (kind === "point") return "本次评估";
  if (kind === "interval") return "结果待确认";
  return "需要补充信息";
}

function evaluateConstraintFixture(rule, assessment, constraintFixture) {
  const requiredConstraintIds = Array.isArray(rule.requiredConstraintIds)
    ? rule.requiredConstraintIds
    : [];
  const expectedFixtureSource = "DEMO-P2-CONSTRAINT-FIXTURE:E01:anti_slip_coating";
  const expectedCheckSource = "DEMO-P2-CONSTRAINT-FIXTURE:E01";
  const expectedBudgetSource = "demo_catalog_fixed:E01:demo_action_antislip_coating";
  const requiredListValid = requiredConstraintIds.length > 0;
  const bindingMatches = Boolean(
    constraintFixture &&
    requiredListValid &&
    constraintFixture.sourceRiskId === rule.sourceRiskId &&
    constraintFixture.sourceRiskTier === rule.sourceRiskTier &&
    constraintFixture.sourceSpaceType === rule.sourceSpaceType &&
    constraintFixture.actionId === rule.actionId &&
    assessment.fixtureId === "E01" &&
    constraintFixture.synthetic === true &&
    constraintFixture.verified === false &&
    constraintFixture.sourceRef === expectedFixtureSource &&
    constraintFixture.constraintBasis === "synthetic_fixture" &&
    constraintFixture.realWorldInstallationStatus === "unknown" &&
    constraintFixture.budget?.sourceRef === expectedBudgetSource &&
    constraintFixture.budget?.synthetic === true &&
    constraintFixture.budget?.verified === false &&
    constraintFixture.budget?.materialMin === 80 &&
    constraintFixture.budget?.materialMax === 150
  );
  const fixtureChecks = bindingMatches && Array.isArray(constraintFixture.checks)
    ? constraintFixture.checks
    : [];
  const checksById = new Map(fixtureChecks.map((check) => [check.constraintId, check]));
  const checks = (requiredListValid ? requiredConstraintIds : ["required_constraints"]).map((constraintId) => {
    const check = checksById.get(constraintId);
    const statusValid = ["pass", "fail", "unknown"].includes(check?.status);
    const hasSource = Array.isArray(check?.sourceRefs)
      && check.sourceRefs.includes(expectedCheckSource);
    const hasValue = check?.actualValue !== null && check?.actualValue !== undefined;
    return check && statusValid && hasSource && hasValue
      ? { ...check }
      : {
          constraintId,
          status: "unknown",
          actualValue: null,
          requiredValue: check?.requiredValue ?? null,
          unit: check?.unit ?? null,
          sourceRefs: check?.sourceRefs ?? []
        };
  });
  const aggregateStatus = !bindingMatches || checks.some((check) => check.status === "unknown")
    ? "unknown"
    : checks.some((check) => check.status === "fail")
      ? "fail"
      : checks.every((check) => check.status === "pass")
        ? "pass"
        : "unknown";
  return { aggregateStatus, checks, bindingMatches, requiredListValid };
}

export function buildSolutionRouting({
  assessment,
  risks = [],
  products = [],
  mappingRules = demoP2MappingRules,
  constraintFixtures = demoConstraintFixtures
}) {
  const formalInput = isFormalPublishedAssessment(assessment);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const demoCandidates = [];
  const blockedSolutions = [];
  const reviewTasks = [];

  if (!formalInput) {
    return {
      route: "review_queue",
      demoCandidates,
      blockedSolutions,
      reviewTasks: [{
        reviewTaskId: `review_${assessment?.riskId ?? assessment?.riskRef ?? "unknown"}`,
        triggerCondition: "UPSTREAM_RISK_REVIEW_REQUIRED",
        triggerDetail: assessment?.reasons?.join("；") || "上游风险结果需要补充信息或人工复核",
        relatedRiskIds: assessment?.riskId || assessment?.riskRef ? [assessment.riskId ?? assessment.riskRef] : [],
        relatedActionIds: [],
        missingInfoList: assessment?.reasonCodes ?? [],
        suggestedReviewMethod: "完成补采、冲突消解或人工确认后重新评估",
        reviewPriority: "high",
        status: "pending"
      }]
    };
  }

  const matchedRules = mappingRules.filter((rule) => (
    rule.sourceRiskId === assessment.riskId &&
    rule.sourceRiskTier === assessment.riskTier &&
    rule.sourceSpaceType === assessment.sourceSpaceType
  ));

  if (!matchedRules.length) {
    return {
      route: "review_queue",
      demoCandidates,
      blockedSolutions,
      reviewTasks: [{
        reviewTaskId: `review_mapping_${assessment.riskId}`,
        triggerCondition: "NO_EXACT_DEMO_MAPPING_RULE",
        triggerDetail: "当前风险结果没有精确匹配的方案规则",
        relatedRiskIds: [assessment.riskId],
        relatedActionIds: [],
        missingInfoList: ["sourceRiskId", "sourceRiskTier", "sourceSpaceType"],
        suggestedReviewMethod: "人工确认风险到改造动作的映射关系",
        reviewPriority: "high",
        status: "pending"
      }]
    };
  }

  matchedRules.forEach((rule, mappingPriority) => {
      const product = productsById.get(rule.productId);
      if (!product) return;
      const displayRisk = risks.find((risk) => risk.id === rule.displayRiskRuleId) ?? null;
      const constraintFixture = constraintFixtures[assessment.fixtureId]?.[rule.actionId];
      const constraintEvaluation = evaluateConstraintFixture(rule, assessment, constraintFixture);
      if (constraintEvaluation.aggregateStatus === "unknown") {
        reviewTasks.push({
          reviewTaskId: `review_${assessment.riskId}_${rule.actionId}`,
          triggerCondition: "PHYSICAL_CONSTRAINT_UNKNOWN",
          triggerDetail: "缺少完整且带来源的空间约束证据",
          relatedRiskIds: [assessment.riskId],
          relatedActionIds: [rule.actionId],
          missingInfoList: constraintEvaluation.checks
            .filter((check) => check.status === "unknown")
            .map((check) => check.constraintId),
          suggestedReviewMethod: product.review,
          reviewPriority: "medium",
          status: "pending",
          product,
          displayRisk,
          constraintChecks: constraintEvaluation.checks
        });
        return;
      }
      if (constraintEvaluation.aggregateStatus === "fail") {
        blockedSolutions.push({
          solutionId: `blocked_${assessment.riskId}_${rule.actionId}`,
          product,
          sourceRiskRef: assessment.riskId,
          actionId: rule.actionId,
          implementationStatus: "blocked_by_constraint",
          constraintChecks: constraintEvaluation.checks,
          authority: "demo_adapter_only"
        });
        return;
      }

      demoCandidates.push({
        solutionId: `solution_${assessment?.riskId ?? "review"}_${product.id}`,
        product,
        sourceRisk: { id: assessment.riskId, name: assessment.riskName, tier: assessment.riskTier },
        displayRisk,
        actionId: rule.actionId,
        actionName: rule.actionName,
        mappingPriority,
        mappingRuleRef: rule.mappingRuleRef,
        authority: "demo_adapter_only",
        constraintStatus: constraintEvaluation.aggregateStatus,
        constraintChecks: constraintEvaluation.checks,
        constraintBasis: constraintFixture.constraintBasis,
        realWorldInstallationStatus: constraintFixture.realWorldInstallationStatus,
        constraintEvidence: {
          sourceRef: constraintFixture.sourceRef,
          synthetic: constraintFixture.synthetic,
          verified: constraintFixture.verified
        },
        implementationStatus: "candidate",
        reviewStatus: "pending",
        reviewReasonCodes: ["REAL_WORLD_INSTALLATION_UNVERIFIED"],
        budget: { ...constraintFixture.budget },
        score: {
          riskReduction: null,
          feasibility: null,
          costBenefit: null,
          total: null,
          formulaVersion: null
        }
      });
  });

  demoCandidates.sort((a, b) => a.mappingPriority - b.mappingPriority);
  return { route: "demo_mapping", demoCandidates, blockedSolutions, reviewTasks };
}

export function buildSolutionCandidates(input) {
  return buildSolutionRouting(input).demoCandidates;
}

export function calculatePlanCoverage(risks = [], selectedProducts = []) {
  const coveredRiskIds = risks
    .filter((risk) => selectedProducts.some((product) => risk.recommendedProductIds.includes(product.id)))
    .map((risk) => risk.id);
  return {
    coveredRiskIds,
    coveredCount: coveredRiskIds.length,
    totalCount: risks.length,
    percent: risks.length ? Math.round((coveredRiskIds.length / risks.length) * 100) : 0
  };
}
