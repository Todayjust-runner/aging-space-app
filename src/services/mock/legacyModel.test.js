import { describe, it, expect } from 'vitest';
import { calculatePatentRiskAssessment, calculatePatentRiskValue, isFormalPublishedAssessment, buildSafetyDisplayView, convertRiskValueToSafety, validateTraceIntegrity, buildSolutionRouting, demoConstraintFixtures, demoP2MappingRules, patentBaseline } from './legacyModel';
import { riskRules, products } from './catalog';
const getRisksBySpace = (rules, id) => rules.filter(rule => rule.space === id);
const e01Profile = {"mobility":"使用手杖","vision":"弱光下视物困难","balance":"平衡能力受限","fallHistory":"有跌倒经历","night":"起夜频繁","spaceUseFrequency":"4 次/日"};
describe('legacy sample safeguards', () => {
  it("reproduces the frozen E01 patent fixture without a random score", () => {
    const assessment = calculatePatentRiskAssessment({ spaceId: "bathroom", profile: e01Profile });

    expect(assessment.fixtureId).toBe("E01");
    expect(assessment.parameters).toMatchObject({ T: 0.8, S: 0.7, E: 0.5, V: 0.6875, K: 1.2, C: 1 });
    expect(assessment.rawRisk).toBe(48.72);
    expect(assessment.riskValueOrInterval).toEqual({ kind: "point", value: 49 });
    expect(assessment.riskTier).toBe("中");
    expect(isFormalPublishedAssessment(assessment)).toBe(true);
  });

  it("derives a read-only safety display without changing the P1 result", () => {
    const assessment = calculatePatentRiskAssessment({ spaceId: "bathroom", profile: e01Profile });
    const before = structuredClone(assessment);
    const display = buildSafetyDisplayView(assessment);

    expect(display).toMatchObject({
      viewType: "SafetyDisplayView",
      displayVersion: "P1-DISPLAY-1.0",
      sourceViewType: "PublishedRiskResult",
      sourceCommit: "00677a0280ad08d496ac3a5a00238f9ef44ebc8b",
      safetyValueOrInterval: { kind: "point", value: 51 },
      scoreDirection: "higher_is_safer",
      readOnly: true
    });
    expect(assessment).toEqual(before);
    expect(assessment.riskValueOrInterval).toEqual({ kind: "point", value: 49 });
    expect(assessment.riskTier).toBe("中");
    expect(assessment).not.toHaveProperty("safetyValueOrInterval");
  });

  it("converts point and interval boundaries while rejecting invalid values", () => {
    expect(convertRiskValueToSafety({ kind: "point", value: 49 })).toEqual({ kind: "point", value: 51 });
    expect(convertRiskValueToSafety({ kind: "point", value: 0 })).toEqual({ kind: "point", value: 100 });
    expect(convertRiskValueToSafety({ kind: "point", value: 100 })).toEqual({ kind: "point", value: 0 });
    expect(convertRiskValueToSafety({ kind: "interval", min: 20, max: 40 })).toEqual({
      kind: "interval",
      min: 60,
      max: 80
    });
    [
      { kind: "point", value: -1 },
      { kind: "point", value: 101 },
      { kind: "interval", min: -1, max: 40 },
      { kind: "interval", min: 20, max: 101 },
      { kind: "interval", min: 60, max: 40 }
    ].forEach((value) => expect(convertRiskValueToSafety(value)).toBeNull());
  });

  it("rejects unpublished or invalid-trace numeric safety displays", () => {
    const assessment = calculatePatentRiskAssessment({ spaceId: "bathroom", profile: e01Profile });

    expect(buildSafetyDisplayView({ ...assessment, resultState: "review_required" })).toBeNull();
    expect(buildSafetyDisplayView({ ...assessment, traceIntegrityState: "invalid" })).toBeNull();
    expect(buildSafetyDisplayView({ ...assessment, traceRecord: null })).toBeNull();
  });

  it("keeps review and unsupported spaces free of safety numbers", () => {
    ["bedroom", "corridor"].forEach((spaceId) => {
      const handoff = calculatePatentRiskAssessment({ spaceId, profile: e01Profile });
      const display = buildSafetyDisplayView(handoff);

      expect(display.safetyValueOrInterval).toEqual({ kind: "review_only" });
      expect(display.safetyValueOrInterval).not.toHaveProperty("value");
      expect(display.safetyValueOrInterval).not.toHaveProperty("min");
      expect(display.safetyValueOrInterval).not.toHaveProperty("max");
    });

    ["kitchen", "living", "balcony"].forEach((spaceId) => {
      const unsupported = calculatePatentRiskAssessment({ spaceId, profile: e01Profile });
      expect(buildSafetyDisplayView(unsupported)).toBeNull();
    });
  });

  it("blocks incomplete, conflicting and unsupported inputs from formal results", () => {
    ["bedroom", "corridor"].forEach((spaceId) => {
      const assessment = calculatePatentRiskAssessment({ spaceId, profile: e01Profile });
      expect(assessment.viewType).toBe("ReviewHandoff");
      expect(assessment).not.toHaveProperty("resultState");
      expect(assessment).not.toHaveProperty("riskValueOrInterval");
      expect(isFormalPublishedAssessment(assessment)).toBe(false);
    });

    ["kitchen", "living", "balcony"].forEach((spaceId) => {
      const assessment = calculatePatentRiskAssessment({ spaceId, profile: e01Profile });
      expect(assessment.registryStatus).toBe("not_in_registry");
      expect(assessment.viewType).toBe("UnsupportedSpaceReviewTask");
      expect(assessment).not.toHaveProperty("riskValueOrInterval");
      expect(isFormalPublishedAssessment(assessment)).toBe(false);
    });
  });

  it("keeps ReviewHandoff complete for review while excluding published-result fields", () => {
    ["bedroom", "corridor"].forEach((spaceId) => {
      const handoff = calculatePatentRiskAssessment({ spaceId, profile: e01Profile });
      expect(handoff.viewType).toBe("ReviewHandoff");
      expect(handoff).toMatchObject({
        assessmentId: expect.stringMatching(/^asmt_/),
        spaceId: expect.stringMatching(/^space_/),
        riskRef: expect.stringMatching(/^risk_/),
        riskResultRef: expect.stringMatching(/^result_/),
        traceRecordRef: expect.stringMatching(/^trace_/),
        reviewRequired: true,
        schemaVersion: patentBaseline.schemaVersion,
        ruleVersion: patentBaseline.ruleVersion,
        gateVersion: patentBaseline.gateVersion,
        contractVersion: patentBaseline.contractVersion
      });
      expect(handoff.reasonSourceRefs.length).toBeGreaterThan(0);
      expect(handoff.reasonCodes.length).toBeGreaterThan(0);
      expect(handoff.supplementalActions.length).toBeGreaterThan(0);
      [
        "parameters",
        "rawRisk",
        "riskValueOrInterval",
        "riskTier",
        "resultState",
        "reviewFlag",
        "traceRecord",
        "traceIntegrityState"
      ].forEach((field) => expect(handoff).not.toHaveProperty(field));
    });

    const unsupported = calculatePatentRiskAssessment({ spaceId: "kitchen", profile: e01Profile });
    expect(unsupported.viewType).toBe("UnsupportedSpaceReviewTask");
    expect(unsupported).not.toHaveProperty("riskResultRef");
    expect(unsupported).not.toHaveProperty("traceRecordRef");

    const bedroom = calculatePatentRiskAssessment({ spaceId: "bedroom", profile: e01Profile });
    const corridor = calculatePatentRiskAssessment({ spaceId: "corridor", profile: e01Profile });
    expect(bedroom.handoffId).toBe("handoff_result_bedroom_001");
    expect(bedroom.reasonSourceRefs).toEqual([
      "capture_ev_night_light",
      "reqset_bedroom_001",
      "risk_bedroom_night_fall@P1-RULE-1.1"
    ]);
    expect(corridor.handoffId).toBe("handoff_result_corridor_001");
  });

  it("validates the frozen trace record instead of trusting a status string", () => {
    const assessment = calculatePatentRiskAssessment({ spaceId: "bathroom", profile: e01Profile });

    expect(validateTraceIntegrity(assessment)).toBe(true);
    expect(assessment.traceRecord.payloadHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(Object.isFrozen(assessment.traceRecord)).toBe(true);
    expect(calculatePatentRiskAssessment({ spaceId: "bathroom", profile: e01Profile }).traceRecord)
      .not.toBe(assessment.traceRecord);
    expect(validateTraceIntegrity({ ...assessment, traceRecord: null })).toBe(false);
    expect(validateTraceIntegrity({
      ...assessment,
      traceRecord: { ...assessment.traceRecord, payloadHash: "sha256:damaged" }
    })).toBe(false);
    expect(validateTraceIntegrity({
      ...assessment,
      riskId: "slippery_floor"
    })).toBe(false);
    [
      { ...assessment, parameters: { ...assessment.parameters, T: 0.81 } },
      { ...assessment, parameterContributions: assessment.parameterContributions.map((item, index) => (
        index === 0 ? { ...item, value: 0.81 } : item
      )) },
      { ...assessment, rawRisk: 48.71 },
      { ...assessment, calculationSteps: { ...assessment.calculationSteps, base: 57 } },
      { ...assessment, evidenceState: "partial" },
      { ...assessment, gateDecisionRecord: { ...assessment.gateDecisionRecord, forcedReviewOnly: true } },
      { ...assessment, versions: { ...assessment.versions, calculationVersion: "P1-CALC-tampered" } }
    ].forEach((tampered) => {
      expect(validateTraceIntegrity(tampered)).toBe(false);
      expect(isFormalPublishedAssessment(tampered)).toBe(false);
    });
    expect(isFormalPublishedAssessment({ ...assessment, traceIntegrityState: "invalid" })).toBe(false);
    expect(isFormalPublishedAssessment({ ...assessment, traceRecord: null })).toBe(false);
  });

  it("routes only the exact E01 source risk through the registered demo adapter", () => {
    const assessment = calculatePatentRiskAssessment({ spaceId: "bathroom", profile: e01Profile });
    const risks = getRisksBySpace(riskRules, "bathroom");
    const routing = buildSolutionRouting({ assessment, risks, products });

    expect(isFormalPublishedAssessment(assessment)).toBe(true);
    expect(isFormalPublishedAssessment({ ...assessment, resultState: "review_required" })).toBe(false);
    expect(isFormalPublishedAssessment({ ...assessment, reviewFlag: true })).toBe(false);
    expect(isFormalPublishedAssessment({
      ...assessment,
      riskValueOrInterval: { kind: "interval", min: 40, max: 55 }
    })).toBe(false);

    expect(routing.route).toBe("demo_mapping");
    expect(routing.demoCandidates).toHaveLength(1);
    expect(routing.reviewTasks).toEqual([]);
    expect(routing.demoCandidates[0]).toMatchObject({
      actionId: "demo_action_antislip_coating",
      authority: "demo_adapter_only",
      constraintStatus: "pass",
      constraintBasis: "synthetic_fixture",
      realWorldInstallationStatus: "unknown",
      budget: {
        materialMin: 80,
        materialMax: 150,
        sourceRef: "demo_catalog_fixed:E01:demo_action_antislip_coating",
        synthetic: true,
        verified: false
      },
      score: { total: null }
    });
    expect(routing.demoCandidates[0].sourceRisk.id).toBe("risk_bathroom_slip");
    expect(assessment.riskValueOrInterval).toEqual({ kind: "point", value: 49 });
    expect(routing.demoCandidates[0].sourceRisk.tier).toBe("中");
    expect(JSON.stringify(routing)).not.toContain("safetyValueOrInterval");
    expect(JSON.stringify(routing)).not.toContain("SafetyDisplayView");
    expect(routing.demoCandidates[0].displayRisk.id).toBe("slippery_floor");
    expect(routing.demoCandidates[0].constraintChecks.every((check) => (
      check.status === "pass" && check.sourceRefs.length > 0
    ))).toBe(true);

    const wrongRiskRules = demoP2MappingRules.map((rule) => ({ ...rule, sourceRiskId: "slippery_floor" }));
    const wrongTierRules = demoP2MappingRules.map((rule) => ({ ...rule, sourceRiskTier: "高" }));
    const wrongSpaceRules = demoP2MappingRules.map((rule) => ({ ...rule, sourceSpaceType: "bedroom" }));
    [wrongRiskRules, wrongTierRules, wrongSpaceRules].forEach((mappingRules) => {
      const mismatch = buildSolutionRouting({ assessment, risks, products, mappingRules });
      expect(mismatch.demoCandidates).toEqual([]);
      expect(mismatch.reviewTasks[0].triggerCondition).toBe("NO_EXACT_DEMO_MAPPING_RULE");
    });
  });

  it("handles missing, unknown and failed constraints without recommendation", () => {
    const assessment = calculatePatentRiskAssessment({ spaceId: "bathroom", profile: e01Profile });
    const risks = getRisksBySpace(riskRules, "bathroom");
    const baseFixture = structuredClone(demoConstraintFixtures.E01.demo_action_antislip_coating);
    const cases = [
      {},
      { E01: { demo_action_antislip_coating: { ...baseFixture, checks: [] } } },
      { E01: { demo_action_antislip_coating: {
        ...baseFixture,
        checks: baseFixture.checks.map((check) => ({ ...check, sourceRefs: [] }))
      } } },
      { E01: { demo_action_antislip_coating: { ...baseFixture, sourceSpaceType: "bedroom" } } },
      { E01: { demo_action_antislip_coating: { ...baseFixture, sourceRiskId: "slippery_floor" } } },
      { E01: { demo_action_antislip_coating: { ...baseFixture, sourceRiskTier: "高" } } },
      { E01: { demo_action_antislip_coating: { ...baseFixture, actionId: "other_action" } } }
    ];

    cases.forEach((constraintFixtures) => {
      const routing = buildSolutionRouting({ assessment, risks, products, constraintFixtures });
      expect(routing.demoCandidates).toEqual([]);
      expect(routing.reviewTasks[0].triggerCondition).toBe("PHYSICAL_CONSTRAINT_UNKNOWN");
    });

    const invalidRuleSets = [
      demoP2MappingRules.map((rule) => ({ ...rule, requiredConstraintIds: [] }))
    ];
    invalidRuleSets.forEach((mappingRules) => {
      const routing = buildSolutionRouting({ assessment, risks, products, mappingRules });
      expect(routing.demoCandidates).toEqual([]);
      expect(routing.reviewTasks[0].triggerCondition).toBe("PHYSICAL_CONSTRAINT_UNKNOWN");
    });

    const invalidFixtures = [
      { ...baseFixture, synthetic: false },
      { ...baseFixture, verified: true },
      { ...baseFixture, sourceRef: "real-world-claim" },
      { ...baseFixture, constraintBasis: "real_world" },
      { ...baseFixture, realWorldInstallationStatus: "verified" },
      { ...baseFixture, checks: baseFixture.checks.map((check) => ({ ...check, status: "approved" })) },
      { ...baseFixture, budget: null },
      { ...baseFixture, budget: { ...baseFixture.budget, sourceRef: "generic_catalog" } },
      { ...baseFixture, budget: { ...baseFixture.budget, synthetic: false } }
    ];
    invalidFixtures.forEach((fixture) => {
      const routing = buildSolutionRouting({
        assessment,
        risks,
        products,
        constraintFixtures: { E01: { demo_action_antislip_coating: fixture } }
      });
      expect(routing.demoCandidates).toEqual([]);
      expect(routing.reviewTasks[0].triggerCondition).toBe("PHYSICAL_CONSTRAINT_UNKNOWN");
    });

    const failedFixture = structuredClone(demoConstraintFixtures);
    failedFixture.E01.demo_action_antislip_coating.checks[0].status = "fail";
    const failed = buildSolutionRouting({ assessment, risks, products, constraintFixtures: failedFixture });
    expect(failed.demoCandidates).toEqual([]);
    expect(failed.blockedSolutions).toHaveLength(1);
    expect(failed.blockedSolutions[0].implementationStatus).toBe("blocked_by_constraint");
  });

  it("creates only a ReviewHandoff when the upstream P1 result is not formal", () => {
    const assessment = calculatePatentRiskAssessment({ spaceId: "bedroom", profile: e01Profile });
    const routing = buildSolutionRouting({
      assessment,
      risks: getRisksBySpace(riskRules, "bedroom"),
      products
    });

    expect(routing.route).toBe("review_queue");
    expect(routing.demoCandidates).toEqual([]);
    expect(routing.reviewTasks).toHaveLength(1);
    expect(routing.reviewTasks[0].triggerCondition).toBe("UPSTREAM_RISK_REVIEW_REQUIRED");
  });


 it('rejects invalid model parameters', () => {
 const valid = { T:0.8, S:0.7, E:0.5, V:0.6875, K:1.2, C:1 };
 for (const key of ['T','S','E','V','C']) { for (const value of [-1, 2, NaN, Infinity]) expect(() => calculatePatentRiskValue({...valid,[key]:value})).toThrow(RangeError); }
 for (const value of [0.79,1.21,NaN]) expect(() => calculatePatentRiskValue({...valid,K:value})).toThrow(RangeError);
 });
});
