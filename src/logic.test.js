import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  communityPosts,
  communityTopics,
  coreEntrances,
  mallCategories,
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
  buildRescanSafetyComparison,
  buildSafetyDisplayView,
  buildSolutionRouting,
  canConfirmPlan,
  calculatePatentRiskAssessment,
  calculatePatentRiskValue,
  calculatePlanCoverage,
  commitProfileDraft,
  convertRiskValueToSafety,
  createCommunityPost,
  demoConstraintFixtures,
  demoP2MappingRules,
  deriveProfileParameters,
  getCaseBySpace,
  getManualReviewItems,
  getRecommendedRisksForProduct,
  getRisksBySpace,
  getSpaceById,
  isFormalPublishedAssessment,
  isCommunityPostDraftValid,
  isProfileComplete,
  inputLimits,
  loadSessionState,
  matchProductsForRisks,
  prioritizeRisksForProfile,
  patentBaseline,
  resolvePublicAssetUrl,
  sanitizeSessionState,
  saveSessionState,
  selectInitialPlanProducts,
  validateTraceIntegrity
} from "./logic.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(currentDir, "../public");
const stylesPath = path.resolve(currentDir, "styles.css");
const appPath = path.resolve(currentDir, "App.jsx");
const e01Profile = {
  mobility: "使用手杖",
  vision: "视力明显受限",
  balance: "平衡能力受限",
  fallHistory: "有跌倒经历",
  night: "起夜频繁",
  spaceUseFrequency: "4 次/日",
  grip: "起身需要借力",
  assistance: "部分动作需辅助"
};

const getCssRule = (styles, selector) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return styles.match(new RegExp(`${escapedSelector}\\s*\\{[^}]*\\}`, "m"))?.[0] ?? "";
};

describe("demo logic", () => {
  it("resolves public assets under the deployment base path", () => {
    expect(resolvePublicAssetUrl("/assets/spaces/bathroom.png", "/")).toBe(
      "/assets/spaces/bathroom.png"
    );
    expect(resolvePublicAssetUrl("/assets/spaces/bathroom.png", "/web-demo/")).toBe(
      "/web-demo/assets/spaces/bathroom.png"
    );
    expect(resolvePublicAssetUrl("https://example.com/image.png", "/web-demo/")).toBe(
      "https://example.com/image.png"
    );
  });

  it("renders data-driven images through the deployment asset resolver", () => {
    const appSource = readFileSync(appPath, "utf8");

    expect(appSource).toContain("resolvePublicAssetUrl");
    expect(appSource).toContain("const assetUrl = (path) =>");
    expect(appSource).toContain("assetUrl(product.imageUrl)");
    expect(appSource).toContain("assetUrl(imageUrl)");
  });

  it("keeps the three product-level entrances visible", () => {
    expect(coreEntrances.map((entry) => entry.id)).toEqual(["scan", "mall", "community"]);
    expect(coreEntrances.map((entry) => entry.label)).toEqual(["扫描评估", "方案商城", "效果社区"]);
  });

  it("provides real mall filters and community posts", () => {
    expect(mallCategories.length).toBeGreaterThanOrEqual(5);
    expect(mallCategories.map((category) => category.id)).toContain("service");
    expect(communityPosts.length).toBeGreaterThanOrEqual(4);
    expect(communityPosts.some((post) => post.comments > 0)).toBe(true);
  });

  it("covers enough home spaces with complete scan data", () => {
    expect(spaces.length).toBeGreaterThanOrEqual(6);

    spaces.forEach((space) => {
      expect(scanTasks[space.id]?.length).toBeGreaterThanOrEqual(3);
      expect(getRisksBySpace(riskRules, space.id).length).toBeGreaterThanOrEqual(3);
      expect(sampleCases.some((caseItem) => caseItem.space === space.id)).toBe(true);
    });
  });

  it("makes every mall item look like a real product listing", () => {
    expect(products.length).toBeGreaterThanOrEqual(36);
    products.forEach((product) => {
      expect(product.imageUrl).toMatch(/^\/assets\/products\/.+\.(png|jpg|jpeg|webp)$/);
      expect(product.rating).toBeGreaterThanOrEqual(4);
      expect(product.sales).toBeGreaterThan(0);
      expect(product.specs.length).toBeGreaterThanOrEqual(2);
      expect(product.guarantees.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("uses enough distinct local visuals across commerce and community", () => {
    const productImages = products.map((product) => product.imageUrl);
    const communityImages = communityPosts.flatMap((post) => post.images ?? []);
    const assetPaths = [...productImages, ...communityImages];

    expect(new Set(productImages).size).toBeGreaterThanOrEqual(36);
    expect(new Set(communityImages).size).toBeGreaterThanOrEqual(13);
    productImages.forEach((imageUrl) => {
      expect(imageUrl).toMatch(/^\/assets\/products\/.+\.(png|jpg|jpeg|webp)$/);
    });
    communityImages.forEach((imageUrl) => {
      expect(imageUrl).toMatch(/^\/assets\/community\/.+\.(png|jpg|jpeg|webp)$/);
    });
    assetPaths.forEach((imageUrl) => {
      expect(existsSync(path.join(publicDir, imageUrl))).toBe(true);
    });

    const hashes = assetPaths.map((assetPath) =>
      createHash("sha256").update(readFileSync(path.join(publicDir, assetPath))).digest("hex")
    );
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it("provides a complete real-content community feed", () => {
    const postTopics = new Set(communityPosts.map((post) => post.topic));
    const coveredSpaces = new Set(communityPosts.map((post) => post.space));

    expect(communityPosts.length).toBeGreaterThanOrEqual(10);
    expect(postTopics).toEqual(new Set(["case", "question", "share", "service"]));
    expect(coveredSpaces).toEqual(
      new Set(["bathroom", "bedroom", "corridor", "kitchen", "living", "balcony"])
    );
    communityPosts.forEach((post) => {
      expect(post.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/);
      expect(post.images.length).toBeGreaterThanOrEqual(1);
      expect(post.images.length).toBeLessThanOrEqual(2);
    });
  });

  it("keeps space, risk, product and community records referentially consistent", () => {
    const riskIds = new Set(riskRules.map((risk) => risk.id));

    spaces.forEach((space) => {
      expect(space.riskCount).toBe(riskRules.filter((risk) => risk.space === space.id).length);
      expect(scanTasks[space.id]).toBeDefined();
    });
    products.forEach((product) => {
      expect(product.riskIds.length).toBeGreaterThan(0);
      product.riskIds.forEach((riskId) => expect(riskIds.has(riskId)).toBe(true));
    });
    communityPosts.forEach((post) => {
      expect(post.imageAlts).toHaveLength(post.images.length);
      expect(post.imageAlts.every((alt) => alt.trim().length >= 4)).toBe(true);
    });
  });

  it("keeps product images semantically mapped to each product", () => {
    const expectedImageById = {
      grab_bar_l: "/assets/products/grab-bar-l.png",
      vertical_bar: "/assets/products/straight-grab-bar.jpg",
      anti_slip_mat: "/assets/products/anti-slip-mat.png",
      anti_slip_coating: "/assets/products/anti-slip-service.jpg",
      threshold_ramp: "/assets/products/threshold-ramp.png",
      motion_night_light: "/assets/products/motion-night-light.png",
      bed_rail: "/assets/products/bed-rail.png",
      corner_guard: "/assets/products/corner-guard.png",
      cable_tray: "/assets/products/cable-tray.png",
      folding_grab_bar: "/assets/products/folding-grab-bar.jpg",
      shower_chair: "/assets/products/shower-chair.jpg",
      toilet_frame: "/assets/products/toilet-frame.jpg",
      transfer_bench: "/assets/products/transfer-bench.jpg",
      raised_toilet_seat: "/assets/products/raised-toilet-seat.jpg",
      sofa_assist: "/assets/products/sofa-assist.jpg",
      anti_slip_strips: "/assets/products/anti-slip-strips.jpg",
      motion_light_bar: "/assets/products/motion-light-bar.jpg",
      rug_grippers: "/assets/products/rug-grippers.jpg",
      kitchen_mat: "/assets/products/kitchen-mat.jpg",
      folding_shower_seat: "/assets/products/folding-shower-seat.webp",
      bedside_night_rail: "/assets/products/bedside-night-rail.webp",
      bathroom_support_handle: "/assets/products/bathroom-support-handle.webp",
      toilet_safety_rail: "/assets/products/toilet-safety-rail.webp",
      wall_mounted_shower_seat: "/assets/products/wall-mounted-shower-seat.webp",
      tpe_bath_mat: "/assets/products/tpe-bath-mat.webp",
      multi_angle_grab_bar: "/assets/products/multi-angle-grab-bar.webp",
      straight_safety_rail: "/assets/products/straight-safety-rail.webp",
      no_drill_toilet_rail: "/assets/products/no-drill-toilet-rail.webp",
      floor_bed_assist_rail: "/assets/products/floor-bed-assist-rail.webp",
      mobile_transfer_chair: "/assets/products/rise-assist-chair.webp",
      folding_bathroom_rail: "/assets/products/folding-bathroom-rail.webp",
      corridor_sensor_light: "/assets/products/corridor-sensor-light.jpg",
      usb_sensor_light: "/assets/products/magnetic-sensor-night-light.jpg",
      slim_motion_light: "/assets/products/bedside-sensor-night-light.jpg",
      clip_sensor_light: "/assets/products/wardrobe-sensor-night-light.jpg",
      layout_review: "/assets/products/layout-review.png"
    };

    products.forEach((product) => {
      expect(product.imageUrl).toBe(expectedImageById[product.id]);
    });
  });

  it("renders the complete marketplace as a progressively expanded product list", () => {
    const appSource = readFileSync(appPath, "utf8");
    const styles = readFileSync(stylesPath, "utf8");

    expect(appSource).toContain("visibleProductLimit");
    expect(appSource).toContain("展开更多");
    expect(appSource).toContain("已展示全部");
    expect(appSource).toContain("selectedShelfFilter");
    expect(appSource).toContain('className="mall-category-rail"');
    expect(appSource).toContain('className="mall-product-list"');
    expect(appSource).toContain("不知道如何选择");
    expect(appSource).not.toContain('className="commerce-grid"');
    expect(appSource).not.toContain('className="mall-feature"');
    expect(getCssRule(styles, ".mall-catalog-shell")).toContain("grid-template-columns");
    expect(appSource).not.toContain("const railProducts = restProducts.slice(8)");
  });

  it("uses post images that match the post topic", () => {
    const expectedImagesById = {
      post_bathroom_grab_bar: [
        "/assets/community/bathroom-before-after-real.jpg"
      ],
      post_bathroom_support_rescan: [
        "/assets/community/bathroom-accessible.jpg",
        "/assets/community/bathroom-care.jpg"
      ],
      post_bedroom_light: [
        "/assets/community/bedroom-night-real.jpg",
        "/assets/community/bedroom-senior.jpg"
      ],
      post_threshold_question: ["/assets/community/threshold-detail.jpg"],
      post_corridor_wire: ["/assets/community/corridor-floor.jpg"],
      post_kitchen_mat: ["/assets/community/kitchen-chinese-home.jpg"],
      post_living_sofa: ["/assets/community/living-room-senior.jpg"],
      post_balcony_threshold: ["/assets/community/balcony-senior.jpg"],
      post_home_visit: [
        "/assets/community/home-assessment-china-1.jpg",
        "/assets/community/home-assessment-china-2.png"
      ],
      post_rollator_path: [
        "/assets/community/doorway-home-visit-1.jpg",
        "/assets/community/doorway-home-visit-2.jpg"
      ],
      post_shower_chair: ["/assets/community/bathroom-caregiver.jpg"]
    };

    communityPosts.forEach((post) => {
      expect(post.images).toEqual(expectedImagesById[post.id]);
    });
    expect(communityPosts.find((post) => post.id === "post_bathroom_grab_bar")).toMatchObject({
      imageFits: ["contain"],
      imageAspects: ["8 / 9"]
    });
  });

  it("does not silently fall back to another room or case", () => {
    expect(getSpaceById(spaces, "")).toBeNull();
    expect(getSpaceById(spaces, "missing-space")).toBeNull();
    expect(getCaseBySpace(sampleCases, "")).toBeNull();
    expect(getCaseBySpace(sampleCases, "missing-space")).toBeNull();
  });

  it("removes obsolete card-stack selectors from the marketplace and community CSS", () => {
    const styles = readFileSync(stylesPath, "utf8");
    const obsoleteSelectors = [
      ".mall-hero",
      ".community-hero",
      ".community-logic",
      ".commerce-card",
      ".case-feed",
      ".community-card",
      ".plan-cart"
    ];

    obsoleteSelectors.forEach((selector) => {
      expect(styles).not.toContain(selector);
    });

    const commerceTileRule = styles.match(/\.commerce-tile\s*\{[^}]+\}/)?.[0] ?? "";
    expect(commerceTileRule).not.toContain("box-shadow");
    expect(commerceTileRule).not.toContain("border:");
  });

  it("keeps the redesigned interface away from card-stack visual language", () => {
    const styles = readFileSync(stylesPath, "utf8");
    const flatSelectors = [
      ".core-entry-card",
      ".space-card",
      ".task-card",
      ".risk-card",
      ".product-card",
      ".case-card",
      ".commerce-tile",
      ".feed-post"
    ];

    flatSelectors.forEach((selector) => {
      const rule = getCssRule(styles, selector);
      expect(rule).not.toContain("box-shadow");
    });
  });

  it("uses product-style labels instead of PPT step labels or image overlays", () => {
    const appSource = readFileSync(appPath, "utf8");
    const styles = readFileSync(stylesPath, "utf8");

    expect(appSource).not.toContain('eyebrow="步骤');
    expect(appSource).not.toContain("<em>报告推荐</em>");
    expect(styles).not.toContain(".product-image em");
  });

  it("keeps the scan screen image-led and the community topbar flush", () => {
    const appSource = readFileSync(appPath, "utf8");
    const styles = readFileSync(stylesPath, "utf8");

    expect(appSource).toContain("scanPreviewImages");
    expect(appSource).toContain("capture-viewfinder");
    expect(appSource).not.toContain("className=\"capture-panel\"");
    expect(getCssRule(styles, ".scan-screen")).toContain("padding-top: 0");
    expect(getCssRule(styles, ".community-screen")).toContain("padding-top: 0");
    expect(styles).toContain("margin-top: 0");
  });

  it("keeps scan as the centered primary action and closes the scan-to-preview flow", () => {
    const appSource = readFileSync(appPath, "utf8");
    const styles = readFileSync(stylesPath, "utf8");
    const previewSource = appSource.slice(
      appSource.indexOf("function PlanPreviewScreen"),
      appSource.indexOf("function CommunityScreen")
    );

    expect(appSource).toContain('const bottomNavOrder = ["mall", "scan", "community"];');
    expect(appSource).not.toContain('label: "复扫"');
    expect(appSource).toContain("scan-complete-panel");
    expect(appSource).toContain("开始智能分析");
    expect(appSource).toContain("查看评估结果");
    expect(appSource).toContain("PlanPreviewScreen");
    expect(appSource).toContain("preview-plan-list");
    expect(appSource).toContain("查看方案预览");
    expect(styles).toContain(".bottom-nav button.center-action");
    expect(styles).toContain("@keyframes successPop");
    expect(styles).toContain(".preview-summary");
    expect(getCssRule(styles, ".scan-complete-panel")).not.toContain("position: sticky");
    expect(getCssRule(styles, ".scan-complete-panel")).not.toContain("bottom:");
    expect(appSource).toContain("capture-done-pill");
    expect(appSource).not.toContain("查看报告");
    expect(previewSource).not.toContain('setActiveEntrance("community")');
    expect(previewSource).not.toContain('setActiveEntrance("mall")');
    expect(previewSource).toContain("确认方案单");
  });

  it("uses iPhone 15 Pro screen geometry and system chrome", () => {
    const appSource = readFileSync(appPath, "utf8");
    const styles = readFileSync(stylesPath, "utf8");

    expect(getCssRule(styles, ".stage")).toContain("433px");
    expect(getCssRule(styles, ".iphone-device")).toContain("--iphone-screen-width: 393px");
    expect(getCssRule(styles, ".iphone-device")).toContain("--iphone-screen-height: 852px");
    expect(getCssRule(styles, ".iphone-device")).toContain("aspect-ratio: 425 / 884");
    expect(getCssRule(styles, ".iphone-device")).toContain("padding: 8px");
    expect(appSource).not.toContain("device-button-camera");
    expect(getCssRule(styles, ".phone-frame")).toContain("border: 7px solid");
    expect(getCssRule(styles, ".device-island::after")).toContain("radial-gradient");
    expect(getCssRule(styles, ".progress-rail")).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(appSource).toContain("function IosStatusBar");
    expect(appSource).toContain('className="ios-system-status"');
    expect(appSource).toContain('className="ios-cellular-bars"');
    expect(appSource).toContain('className="ios-wifi-glyph"');
    expect(appSource).toContain('className="ios-battery-glyph"');
    expect(appSource).toContain('<span className="ios-time">9:41</span>');
    expect(appSource).not.toContain("ios-status-icons");
    expect(appSource).not.toContain("iosTimeFormatter");
    expect(appSource).toContain("device-button-power");
    expect(appSource).toContain("device-antenna-left-top");
    expect(appSource).toContain("device-antenna-right-bottom");
    expect(appSource).not.toContain("<span>5G</span>");
    expect(getCssRule(styles, ".phone-status")).toContain("height: 54px");
    expect(getCssRule(styles, ".phone-status")).toContain("grid-template-columns: 82px 1fr 82px");
    expect(getCssRule(styles, ".phone-status")).toContain("align-items: center");
    expect(getCssRule(styles, ".phone-status")).toContain("padding: 5px 26px 0");
    expect(getCssRule(styles, ".ios-system-status")).toContain("width: 78px");
    expect(getCssRule(styles, ".ios-system-status")).toContain("shape-rendering: geometricPrecision");
    expect(styles).toContain("@media (max-width: 600px)");
    expect(styles).not.toContain("@media (max-width: 960px)");
    expect(styles).toMatch(
      /\.phone-status,\s*\.device-island,\s*\.device-home,\s*\.device-button\s*\{\s*display: none;/
    );
    expect(appSource).toContain('<span className="no-break">分析结束后</span>');
    expect(getCssRule(styles, ".no-break")).toContain("white-space: nowrap");
  });

  it("keeps AI analysis after capture in a dedicated buffered recognition step", () => {
    const appSource = readFileSync(appPath, "utf8");
    const styles = readFileSync(stylesPath, "utf8");
    const scanSource = appSource.slice(
      appSource.indexOf("function ScanScreen"),
      appSource.indexOf("function AnalysisScreen")
    );
    const analysisSource = appSource.slice(
      appSource.indexOf("function AnalysisScreen"),
      appSource.indexOf("function ReportScreen")
    );
    const matchSource = appSource.slice(
      appSource.indexOf("function MatchScreen"),
      appSource.indexOf("function MallScreen")
    );
    const previewSource = appSource.slice(
      appSource.indexOf("function PlanPreviewScreen"),
      appSource.indexOf("function CommunityScreen")
    );

    expect(appSource).toContain('{ key: "analysis", label: "分析", icon: Cpu }');
    expect(scanSource).not.toContain("ai-recognition-panel");
    expect(scanSource).not.toContain("AI已识别");
    expect(scanSource).toContain("全部采集完成");
    expect(scanSource).toContain("开始智能分析");
    expect(scanSource.indexOf("capture-task-list")).toBeLessThan(scanSource.indexOf("开始智能分析"));
    expect(scanSource.indexOf("scan-complete-panel")).toBeLessThan(scanSource.indexOf("capture-task-list"));
    expect(scanSource).toContain("完成采集，进入分析");
    expect(scanSource).not.toContain("完成采集，查看风险");
    expect(scanSource).toContain("光线/对焦检查");
    expect(scanSource).toContain("视角采集");
    expect(scanSource).not.toContain("风险点采集");
    expect(appSource).toContain("setCompletedTasks([])");
    expect(appSource).not.toContain("setCompletedTasks([scanTasks[nextSpaceId][0].id])");
    expect(appSource).toContain("maxUnlockedStep");
    expect(appSource).toContain("disabled={locked}");
    expect(appSource).not.toContain("onClick={() => setStep(index)}");
    expect(appSource).not.toContain('label="识别风险"');
    expect(appSource).toContain('label="风险点"');
    expect(spaces.map((space) => space.description).join("\n")).not.toContain("优先识别");
    expect(spaces.map((space) => space.description).join("\n")).not.toMatch(/^识别/m);
    expect(analysisSource).toContain("analysis-buffer-screen");
    expect(analysisSource).toContain("智能识别中");
    expect(analysisSource).toContain("缓冲识别");
    expect(analysisSource).toContain("识别完成");
    expect(analysisSource).toContain("评估报告已生成");
    expect(analysisSource).toContain("analysis-command-center");
    expect(analysisSource).toContain("analysis-inline-recognition");
    expect(analysisSource).toContain("analysis-live-feed");
    expect(analysisSource).not.toContain("analysis-signal-grid");
    expect(analysisSource).toContain("智能评估");
    expect(analysisSource).toContain("analysisProgressTargets");
    expect(analysisSource).toContain("setAnalysisProgress");
    expect(analysisSource).toContain("analysisProgressTarget");
    expect(analysisSource).toContain("processingValue");
    expect(analysisSource).toContain("completeValue");
    expect(analysisSource).toContain("getAnalysisItemValue");
    expect(analysisSource).toContain("analysis-result-summary");
    expect(analysisSource).not.toContain("sourceFrames");
    expect(analysisSource).not.toContain("analysisCopy");
    expect(analysisSource).not.toContain("source-frame-strip");
    expect(analysisSource).not.toContain("data-frame-lines");
    expect(analysisSource).not.toContain("recognition-viewport");
    expect(analysisSource).not.toContain("previewImage");
    expect(analysisSource).not.toContain("<img src={previewImage}");
    expect(analysisSource).not.toContain("Math.round(((activeIndex + 1) / analysisItems.length) * 100)");
    expect(analysisSource).not.toContain("analysis-orbit");
    expect(analysisSource).not.toContain("analysis-buffer-timeline");
    expect(analysisSource).toContain("analysis-wait-button");
    expect(analysisSource).toContain("正在分析");
    expect(analysisSource).toContain("analysisComplete");
    const commandCenterSource = analysisSource.slice(
      analysisSource.indexOf("analysis-command-center"),
      analysisSource.indexOf("<section className=\"analysis-live-feed\"")
    );
    expect(commandCenterSource).toContain("analysis-inline-recognition");
    expect(commandCenterSource).toContain("analysis-progress-panel");
    expect(commandCenterSource).not.toContain("<p>");
    expect(commandCenterSource).not.toContain("recognition-viewport");
    expect(commandCenterSource).not.toContain("source-frame-strip");
    expect(matchSource).toContain("decision-engine-panel");
    expect(matchSource).toContain("方案匹配");
    expect(matchSource).toContain("智能匹配");
    expect(matchSource).toContain("安装条件");
    expect(matchSource).toContain("recommendation-card");
    expect(previewSource).toContain("selected-plan-summary");
    expect(previewSource).toContain("已选改造方案");
    expect(previewSource).toContain("完成改造后按原路径复扫");
    expect(previewSource).not.toContain("家属端");
    expect(previewSource).not.toContain("服务端");
    expect(styles).toContain(".analysis-buffer-screen");
    expect(styles).toContain(".analysis-command-center");
    expect(styles).toContain(".analysis-inline-recognition");
    expect(styles).toContain(".analysis-live-feed");
    expect(styles).not.toContain(".analysis-signal-grid");
    expect(styles).not.toContain(".recognition-viewport");
    expect(styles).not.toContain(".source-frame-strip");
    expect(styles).not.toContain(".data-frame-lines");
    expect(getCssRule(styles, ".analysis-command-center")).not.toContain("margin: 0 -18px");
    expect(getCssRule(styles, ".analysis-command-center")).toContain("border-radius: var(--radius)");
    expect(getCssRule(styles, ".analysis-command-center")).not.toContain("#18241f");
    expect(getCssRule(styles, ".analysis-progress-track span")).toContain("transition:");
    expect(getCssRule(styles, ".analysis-progress-panel strong")).toContain("color: var(--primary-dark)");
    expect(styles).not.toContain(".source-frame-strip img");
    expect(styles).not.toContain(".analysis-orbit");
    expect(styles).toContain(".analysis-wait-button:disabled");
    expect(styles).toContain(".scan-screen > *");
    expect(styles).toContain("flex-shrink: 0");
    expect(getCssRule(styles, ".task-card")).toContain("grid-template-columns: 34px minmax(0, 1fr) auto");
    expect(scanSource).not.toContain("<button onClick={() => completeTask(task.id)}>");
    expect(styles).not.toContain("scanLine");
    expect(styles).toContain(".engine-flow-grid");
    expect(getCssRule(styles, ".decision-engine-panel")).not.toContain("linear-gradient");
    expect(getCssRule(styles, ".decision-engine-panel")).not.toContain("radial-gradient");
    expect(getCssRule(styles, ".engine-flow-grid")).toContain(
      "grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr)"
    );
    expect(styles).toContain(".selected-plan-summary");
    expect(styles).not.toContain(".platform-device-panel");
  });

  it("keeps the scan home neutral before recognition starts", () => {
    const appSource = readFileSync(appPath, "utf8");
    const styles = readFileSync(stylesPath, "utf8");
    const homeSource = appSource.slice(
      appSource.indexOf("function HomeScreen"),
      appSource.indexOf("function SpaceScreen")
    );

    expect(homeSource).toContain("scan-home-overview");
    expect(homeSource).toContain("scan-launch-button");
    expect(homeSource).not.toContain("capture-route");
    expect(homeSource).toContain("开始评估");
    expect(homeSource).toContain("家庭空间");
    expect(homeSource).not.toContain("currentSpace");
    expect(homeSource).not.toContain("previewImage");
    expect(homeSource).not.toContain("resetForSpace");
    expect(homeSource).not.toContain("spaces.map");
    expect(homeSource).not.toContain("scan-home-space");
    expect(homeSource).not.toContain("setStep(2)");
    expect(homeSource).not.toContain("卫生间");
    expect(styles).not.toContain("neutral-scan-panel");
    expect(styles).not.toContain("scan-home-neutral");
    expect(appSource).toContain("scanPreviewImages");
    expect(appSource).not.toContain("spacePreviewImages");
    expect(appSource).not.toContain("homePreviewImages");
    expect(homeSource).not.toContain("缺少扶手");
    expect(homeSource).not.toContain("门槛高差");
    expect(homeSource).not.toContain("高差位置");
    expect(homeSource).not.toContain("湿区防滑");
    expect(homeSource).not.toContain("risk-shortcuts");
    expect(homeSource).not.toContain("按 App");
    expect(homeSource).not.toContain("评估路径");
    expect(getCssRule(styles, ".evidence-panel")).toContain("display: none");
  });

  it("does not preselect a room before the user chooses one", () => {
    const appSource = readFileSync(appPath, "utf8");

    expect(appSource).toContain('const [spaceId, setSpaceId] = useState(initialSessionState.spaceId ?? "");');
    expect(appSource).toContain("selectedSpaceId: spaceId");
    expect(appSource).toContain("请选择一个空间");
    expect(appSource).toContain('className={`space-card space-card-${space.id} ${space.id === selectedSpaceId ? "selected" : ""}`');
    expect(appSource).toContain("disabled={!canStartCapture}");
    expect(appSource).not.toContain('const [spaceId, setSpaceId] = useState("bathroom")');
  });

  it("keeps all six space previews in one warm rendered visual system", () => {
    const appSource = readFileSync(appPath, "utf8");
    const styles = readFileSync(stylesPath, "utf8");

    expect(appSource).toContain('kitchen: "/assets/spaces/kitchen.png"');
    expect(appSource).toContain('bathroom: "/assets/spaces/bathroom-accessible-warm.jpg"');
    expect(appSource).toContain('corridor: "/assets/spaces/corridor-warm.jpg"');
    expect(appSource).not.toContain('corridor: "/assets/spaces/corridor.png"');
    expect(appSource).not.toContain('kitchen: "/assets/spaces/kitchen.jpg"');
    expect(getCssRule(styles, ".space-card-media img")).toContain("filter:");
    expect(getCssRule(styles, ".space-card-balcony .space-card-media img")).toContain("scale(1.24)");
    expect(styles).not.toContain(".space-card-bathroom .space-card-media img");
    expect(styles).not.toContain(".space-card-corridor .space-card-media img");
  });

  it("keeps mall recommendations tied to the selected report", () => {
    const appSource = readFileSync(appPath, "utf8");

    expect(appSource).toContain("hasAssessment");
    expect(appSource).toContain("评估后获取专属方案");
    expect(appSource).not.toContain("setPlanItemIds(nextMatchedProducts.slice(0, 2)");
    expect(appSource).toContain("Number(recommendedIds.has(b.id)) - Number(recommendedIds.has(a.id))");
    expect(appSource).toContain('hasAssessment ? `${currentSpace.name}评估已接入，优先展示匹配方案`');
    expect(appSource).toContain('{ id: "recommended", label: "报告推荐", disabled: !hasAssessment }');
    expect(appSource).toContain("if (canAddToPlan) togglePlanItem(product.id)");
    expect(appSource).toContain("recommendedIds.has(product.id)");
    expect(appSource).toContain("catalogActionLabel");
    expect(appSource).toContain("匹配条件");
  });

  it("shows product and case images without cropping important content", () => {
    const styles = readFileSync(stylesPath, "utf8");

    [".plan-product-thumb", ".product-image img", ".preview-plan-list img"].forEach((selector) => {
      expect(getCssRule(styles, selector)).toContain("object-fit: contain");
    });
    [".capture-viewfinder img", ".post-image-grid img"].forEach((selector) => {
      expect(getCssRule(styles, selector)).toContain("object-fit: cover");
    });
  });

  it("keeps user-facing scan and profile flows free of demo implementation wording", () => {
    const appSource = readFileSync(appPath, "utf8");

    [
      "使用样例识别",
      "用样例",
      "样例采集",
      "Demo",
      "本地 Demo",
      "仅用于 Demo",
      "老人画像",
      "技术组",
      "答辩",
      "第一版",
      "AIGC",
      "产品库不是"
    ].forEach((term) => {
      expect(appSource).not.toContain(term);
    });

    expect(appSource).toContain("defaultElderProfile");
    expect(appSource).toContain("待确认");
    expect(appSource).toContain("本次评估对象");
    expect(appSource).toContain("确认/修改");
    expect(appSource).toContain("保存老人情况");
    expect(appSource).toContain("用户主动确认 · 不采集生理传感数据");
    ["原型模拟", "演示候选", "演示条件", "演示样例", "社区发布样例", "合成演示"]
      .forEach((term) => expect(appSource).not.toContain(term));
    expect(appSource).toContain("视力情况");
    expect(appSource).toContain("握力/支撑能力");
    expect(appSource).toContain("是否需要辅助");
    expect(appSource).not.toContain("拍摄此处");
    expect(appSource).toContain("光线/对焦检查");
    expect(appSource).toContain("老人情况调整提示顺序");
    expect(appSource).toContain("age-stepper");
    expect(appSource).toContain("减少年龄");
    expect(appSource).toContain("增加年龄");
    expect(appSource).not.toContain('<input value={profile.age}');
  });

  it("does not expose backend database language in user-facing data", () => {
    const visibleText = [
      ...communityTopics.map((topic) => topic.label),
      ...communityPosts.flatMap((post) => [post.title, post.content, post.badge]),
      ...sampleCases.flatMap((caseItem) => [caseItem.title, caseItem.feedback, caseItem.status])
    ].join(" ");

    expect(visibleText).not.toContain("入库");
    expect(visibleText).not.toContain("数据库");
    expect(visibleText).not.toContain("案例库");
    expect(visibleText).not.toContain("规则库");
  });

  it("returns ordered risks for the selected space", () => {
    const risks = getRisksBySpace(riskRules, "bathroom");

    expect(risks).toHaveLength(3);
    expect(risks[0].level).toBe("高");
  });

  it("keeps rule risks stable and derives profile exposure without fake weight boosts", () => {
    const risks = getRisksBySpace(riskRules, "bedroom");
    const prioritized = prioritizeRisksForProfile(risks, {
      ...e01Profile,
      notes: "夜间视物较慢"
    });
    const profileParameters = deriveProfileParameters(e01Profile);

    expect(prioritized.map((risk) => risk.id)).toEqual(risks.map((risk) => risk.id));
    expect(profileParameters.exposure).toBe(0.5);
    expect(profileParameters.vulnerability).toBe(0.6875);
  });

  it("builds an explainable individual-and-space human factor judgement", () => {
    const risks = getRisksBySpace(riskRules, "bathroom");
    const p1Assessment = calculatePatentRiskAssessment({ spaceId: "bathroom", profile: e01Profile });
    const assessment = buildHumanFactorAssessment(e01Profile, risks, p1Assessment);
    const thresholdJudgement = assessment.riskJudgements.find((item) => item.riskId === "threshold_height");

    expect(assessment.isPrototype).toBe(true);
    expect(assessment.individualFactors.map((item) => item.label)).toEqual([
      "行动能力",
      "视力情况",
      "平衡状态",
      "跌倒史"
    ]);
    expect(assessment.parameters).toMatchObject({ E: 0.5, V: 0.6875 });
    expect(assessment.spatialFactors.find((item) => item.id === "threshold")).toMatchObject({
      status: "已识别风险",
      riskName: "门槛高差可能绊倒"
    });
    expect(thresholdJudgement).not.toHaveProperty("weight");
    expect(thresholdJudgement.reasons.join("")).toContain("通行");
  });

  it("reports plan coverage without converting it into a safety score", () => {
    const risks = getRisksBySpace(riskRules, "bathroom");
    const fullSelection = matchProductsForRisks(risks, products);
    const partialSelection = fullSelection.filter((product) => product.id === "grab_bar_l");
    const emptyCoverage = calculatePlanCoverage(risks, []);
    const partialCoverage = calculatePlanCoverage(risks, partialSelection);
    const fullCoverage = calculatePlanCoverage(risks, fullSelection);

    expect(emptyCoverage.coveredCount).toBe(0);
    expect(partialCoverage.coveredCount).toBeGreaterThan(0);
    expect(fullCoverage.coveredCount).toBe(risks.length);
    expect(fullCoverage).not.toHaveProperty("safetyScore");
    expect(fullCoverage).not.toHaveProperty("riskReduction");
  });

  it("builds an initial plan that covers different risks instead of duplicate products", () => {
    const risks = getRisksBySpace(riskRules, "bathroom");
    const matched = matchProductsForRisks(risks, products);
    const initialPlan = selectInitialPlanProducts(matched, risks, 3);
    const coveredRiskIds = new Set(initialPlan.flatMap((product) => product.riskIds));

    expect(initialPlan.map((product) => product.id)).toEqual([
      "grab_bar_l",
      "threshold_ramp",
      "anti_slip_mat"
    ]);
    risks.forEach((risk) => expect(coveredRiskIds.has(risk.id)).toBe(true));
  });

  it("matches products from risk ids instead of generic shop categories", () => {
    const risks = getRisksBySpace(riskRules, "bathroom");
    const matched = matchProductsForRisks(risks, products);
    const names = matched.map((product) => product.name);

    expect(names).toContain("L 型防滑扶手");
    expect(names).toContain("门槛坡化垫");
  });

  it("keeps manual review visible for construction or safety related items", () => {
    const risks = getRisksBySpace(riskRules, "bedroom");
    const matched = matchProductsForRisks(risks, products);
    const reviewItems = getManualReviewItems(risks, matched);

    expect(reviewItems).toContain("床边起身通道不足");
    expect(reviewItems).toContain("床边起身扶手");
  });

  it("builds an explainable report summary", () => {
    const space = getSpaceById(spaces, "bathroom");
    const risks = getRisksBySpace(riskRules, "bathroom");
    const assessment = calculatePatentRiskAssessment({ spaceId: "bathroom", profile: e01Profile });
    const solutionRouting = buildSolutionRouting({ assessment, risks, products });
    const candidateProducts = solutionRouting.demoCandidates.map((solution) => solution.product);
    const report = buildReport({ space, risks, products: candidateProducts, assessment, solutionRouting });

    expect(report.title).toContain("卫生间");
    expect(report.summary).toContain("采集画面");
    expect(report.summary).toContain("老人情况");
    expect(report.internalRiskValue).toBe("49");
    expect(report.safetyValue).toBe("51");
    expect(report.safetyDisplay).toMatchObject({
      displayVersion: "P1-DISPLAY-1.0",
      safetyValueOrInterval: { kind: "point", value: 51 },
      scoreDirection: "higher_is_safer",
      readOnly: true
    });
    expect(report.formalInput).toBe(true);
    expect(report.budget.max).toBeGreaterThan(report.budget.min);
  });

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

  it("matches recommendations by risk context instead of shared keywords", () => {
    const bathroomRisks = getRisksBySpace(riskRules, "bathroom");
    const bathroomIds = matchProductsForRisks(bathroomRisks, products).map((product) => product.id);
    const sofaRisk = riskRules.find((risk) => risk.id === "sofa_stand_support");
    const sofaIds = matchProductsForRisks([sofaRisk], products).map((product) => product.id);
    const kitchenTurningRisk = riskRules.find((risk) => risk.id === "kitchen_turning_space");
    const kitchenTurningIds = matchProductsForRisks([kitchenTurningRisk], products).map((product) => product.id);
    const balconyReachRisk = riskRules.find((risk) => risk.id === "balcony_reach_risk");
    const balconyReachIds = matchProductsForRisks([balconyReachRisk], products).map((product) => product.id);

    expect(bathroomIds).not.toContain("transfer_bench");
    expect(bathroomIds).not.toContain("vertical_bar");
    expect(bathroomIds).not.toContain("folding_grab_bar");
    expect(sofaIds).toContain("sofa_assist");
    expect(sofaIds).not.toContain("toilet_frame");
    expect(sofaIds).not.toContain("raised_toilet_seat");
    expect(kitchenTurningIds).toEqual(["layout_review"]);
    expect(balconyReachIds).toEqual(["layout_review"]);
  });

  it("uses the same contextual mapping for marketplace recommendation reasons", () => {
    const bathroomRisks = getRisksBySpace(riskRules, "bathroom");
    const grabBar = products.find((product) => product.id === "grab_bar_l");
    const transferBench = products.find((product) => product.id === "transfer_bench");

    expect(getRecommendedRisksForProduct(bathroomRisks, grabBar).map((risk) => risk.id)).toEqual([
      "no_shower_grab_bar"
    ]);
    expect(getRecommendedRisksForProduct(bathroomRisks, transferBench)).toEqual([]);
  });

  it("keeps products marked as no-review out of the manual review list", () => {
    const slipperyRisk = riskRules.find((risk) => risk.id === "slippery_floor");
    const noReviewProduct = products.find((product) => product.id === "anti_slip_mat");

    expect(getManualReviewItems([slipperyRisk], [noReviewProduct])).not.toContain(noReviewProduct.name);
  });

  it("only allows a non-empty plan to be confirmed", () => {
    expect(canConfirmPlan([])).toBe(false);
    expect(canConfirmPlan(["grab_bar_l"])).toBe(true);
  });

  it("does not present sample commerce and community data as verified operations data", () => {
    const appSource = readFileSync(appPath, "utf8");
    const visibleCommunityCopy = [
      ...coreEntrances.map((entry) => entry.description),
      ...communityPosts.map((post) => post.role)
    ].join(" ");

    expect(appSource).not.toContain("合成演示");
    expect(appSource).toContain("模拟估价");
    expect(appSource).toContain("安全分越高越安全");
    expect(appSource).not.toContain("数值越高风险越高");
    expect(appSource).not.toContain("安全分提升");
    expect(appSource).not.toContain("{featuredProduct.rating} 分 · {featuredProduct.sales} 人选用");
    expect(appSource).not.toContain("{product.rating} 分 · {product.sales} 人选用");
    expect(visibleCommunityCopy).not.toContain("真实改造");
    expect(visibleCommunityCopy).not.toContain("认证");
  });

  it("explains why an empty plan cannot be confirmed", () => {
    const appSource = readFileSync(appPath, "utf8");

    expect(appSource).toContain("至少选择一项改造方案");
  });

  it("keeps credibility labels readable and all community topics visible at 375px", () => {
    const styles = readFileSync(stylesPath, "utf8");

    expect(getCssRule(styles, ".community-tabs.feed-tabs")).toContain(
      "grid-template-columns: repeat(5, minmax(0, 1fr))"
    );
    expect(getCssRule(styles, ".community-topbar > div > small")).toContain("font-size: 12px");
    expect(getCssRule(styles, ".price-line small")).toContain("font-size: 12px");
    expect(getCssRule(styles, ".mall-feature-meta small")).toContain("font-size: 12px");
    expect(styles).not.toMatch(/font-size:\s*(?:8|9|10|11)px/);
    expect(getCssRule(styles, ".post-actions button")).toContain("min-height: 44px");
    expect(getCssRule(styles, ".risk-actions button")).toContain("min-height: 44px");
    expect(styles).toMatch(
      /\.commerce-actions \.primary-button,[\s\S]*?\.selected-button\s*\{[^}]*min-height:\s*44px/
    );
  });

  it("marks only P1 registry spaces as eligible for formal calculation", () => {
    spaces.forEach((space) => {
      const assessment = calculatePatentRiskAssessment({ spaceId: space.id, profile: e01Profile });
      if (patentBaseline.supportedSpaces.includes(space.id)) {
        expect(space.registryStatus).toBe("registered");
      } else {
        expect(space.registryStatus).toBe("not_in_registry");
        expect(assessment.viewType).toBe("UnsupportedSpaceReviewTask");
        expect(assessment).not.toHaveProperty("riskValueOrInterval");
      }
    });
  });

  it("renders patent risk tiers instead of invented safety tiers", () => {
    const appSource = readFileSync(appPath, "utf8");
    const styles = readFileSync(stylesPath, "utf8");
    expect(appSource).toContain("levelKey");
    expect(styles).toContain(".score-card.level-risk-high");
    expect(styles).toContain(".score-card.level-risk-medium");
    expect(styles).toContain(".score-card.level-risk-review");
    expect(appSource).not.toContain("report.score");
    expect(styles).not.toContain(".score-card.level-高");
  });

  it("keeps the visible default age aligned with the saved profile state", () => {
    const appSource = readFileSync(appPath, "utf8");
    const profileSource = appSource.slice(
      appSource.indexOf("function ProfilePanel"),
      appSource.indexOf("function SectionTitle")
    );
    const draft = {
      age: "75",
      living: "独居",
      mobility: "使用助行器",
      night: "起夜频繁"
    };
    const savedProfile = commitProfileDraft(draft);
    draft.age = "80";

    expect(savedProfile.age).toBe("75");
    expect(savedProfile).not.toBe(draft);
    expect(profileSource).toContain("draftProfile");
    expect(profileSource).toContain("取消修改");
    expect(profileSource).toContain("setProfile(commitProfileDraft(draftProfile))");
  });

  it("requires a complete profile before capture and keeps the primary bathroom path scorable", () => {
    const appSource = readFileSync(appPath, "utf8");
    const primaryProfile = {
      mobility: "使用手杖",
      vision: "弱光下视物困难",
      balance: "平衡能力受限",
      fallHistory: "有跌倒经历",
      night: "起夜频繁",
      spaceUseFrequency: "4 次/日"
    };

    expect(isProfileComplete({ mobility: "使用手杖" })).toBe(false);
    expect(isProfileComplete(primaryProfile)).toBe(true);
    expect(buildSafetyDisplayView(calculatePatentRiskAssessment({
      spaceId: "bathroom",
      profile: primaryProfile
    })).safetyValueOrInterval).toEqual({ kind: "point", value: 51 });
    expect(appSource).toContain("const canStartCapture = hasSelectedSpace && profileReady");
    expect(appSource).toContain("请先确认老人情况");
    expect(appSource).toContain('bathroom: "可生成完整评估"');
    expect(appSource).toContain('bedroom: "需补充夜间证据"');
    expect(appSource).toContain('corridor: "需核对通道测量"');
  });

  it("writes and restores the real assessment state through storage", () => {
    const values = new Map();
    const storage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value)
    };
    const state = {
      activeEntrance: "scan",
      step: 2,
      spaceId: "bathroom",
      completedTasks: ["bathroom-overview"],
      elderProfile: {
        age: "75",
        living: "独居",
        mobility: "使用助行器",
        night: "起夜频繁"
      },
      planItemIds: ["grab_bar_l"],
      planConfirmed: false,
      maxUnlockedStep: 2
    };

    expect(saveSessionState(storage, "zhihui-aging-demo:v2", state)).toBe(true);
    expect(loadSessionState(storage, "zhihui-aging-demo:v2")).toEqual(state);
    expect(loadSessionState({ getItem: () => "not-json" }, "bad-state")).toEqual({});
  });

  it("fails closed when persisted session data is malformed", () => {
    const options = {
      entranceIds: coreEntrances.map((entry) => entry.id),
      spaceIds: spaces.map((space) => space.id),
      topicIds: communityTopics.map((topic) => topic.id).filter((id) => id !== "all"),
      productIds: products.map((product) => product.id),
      taskIdsBySpace: Object.fromEntries(
        Object.entries(scanTasks).map(([id, tasks]) => [id, tasks.map((task) => task.id)])
      )
    };

    [null, 42, "bad", []].forEach((value) => {
      expect(sanitizeSessionState(value, options)).toEqual({});
    });

    expect(sanitizeSessionState({
      activeEntrance: "admin",
      step: 99,
      maxUnlockedStep: 99,
      spaceId: "not-a-space",
      completedTasks: "all",
      elderProfile: [],
      planItemIds: ["not-a-product"],
      planConfirmed: true,
      communityUserPosts: 3
    }, options)).toMatchObject({
      activeEntrance: "scan",
      step: 1,
      maxUnlockedStep: 1,
      spaceId: "",
      completedTasks: [],
      elderProfile: {},
      planItemIds: [],
      planConfirmed: false,
      communityUserPosts: []
    });
  });

  it("does not unlock analysis from forged capture progress", () => {
    const bathroomTaskIds = scanTasks.bathroom.map((task) => task.id);
    const options = {
      entranceIds: coreEntrances.map((entry) => entry.id),
      spaceIds: spaces.map((space) => space.id),
      topicIds: communityTopics.map((topic) => topic.id).filter((id) => id !== "all"),
      productIds: products.map((product) => product.id),
      taskIdsBySpace: { bathroom: bathroomTaskIds }
    };
    const sanitized = sanitizeSessionState({
      activeEntrance: "scan",
      step: 6,
      maxUnlockedStep: 6,
      spaceId: "bathroom",
      completedTasks: [bathroomTaskIds[0], "unknown", bathroomTaskIds[0]],
      planItemIds: ["unknown", "anti_slip_coating"],
      planConfirmed: true
    }, options);

    expect(sanitized.completedTasks).toEqual([bathroomTaskIds[0]]);
    expect(sanitized.step).toBe(2);
    expect(sanitized.maxUnlockedStep).toBe(2);
    expect(sanitized.planItemIds).toEqual(["anti_slip_coating"]);
  });

  it("sanitizes persisted community posts and bounded user input", () => {
    const options = {
      entranceIds: coreEntrances.map((entry) => entry.id),
      spaceIds: spaces.map((space) => space.id),
      topicIds: communityTopics.map((topic) => topic.id).filter((id) => id !== "all"),
      productIds: products.map((product) => product.id),
      taskIdsBySpace: {}
    };
    const oversizedTitle = "标".repeat(inputLimits.communityTitle + 1);
    const oversizedContent = "文".repeat(inputLimits.communityContent + 1);
    expect(isCommunityPostDraftValid({
      title: oversizedTitle,
      content: "正文",
      topic: "share",
      space: "living"
    })).toBe(false);
    expect(isCommunityPostDraftValid({
      title: "标题",
      content: oversizedContent,
      topic: "share",
      space: "living"
    })).toBe(false);

    const sanitized = sanitizeSessionState({
      communityUserPosts: [
        null,
        { id: "foreign", topic: "share", space: "living", title: "标题", content: "正文" },
        {
          id: "post_local_safe",
          topic: "share",
          space: "living",
          title: "  合法标题  ",
          content: "  合法正文  ",
          author: 123,
          likes: -8,
          comments: Number.NaN,
          images: ["javascript:alert(1)"]
        }
      ]
    }, options);

    expect(sanitized.communityUserPosts).toHaveLength(1);
    expect(sanitized.communityUserPosts[0]).toMatchObject({
      id: "post_local_safe",
      title: "合法标题",
      content: "合法正文",
      author: "当前用户",
      likes: 0,
      comments: 0,
      images: []
    });
  });

  it("caps persisted local community posts to protect browser storage", () => {
    const options = {
      entranceIds: ["scan", "mall", "community"],
      spaceIds: ["living"],
      topicIds: ["share"],
      productIds: [],
      taskIdsBySpace: {}
    };
    const communityUserPosts = Array.from({ length: 7 }, (_, index) => ({
      id: `post_local_${index}`,
      topic: "share",
      space: "living",
      title: `标题${index}`,
      content: `正文${index}`
    }));

    expect(sanitizeSessionState({ communityUserPosts }, options).communityUserPosts).toHaveLength(4);
  });

  it("keeps internal registry terminology out of user-facing review reasons", () => {
    const patentSource = readFileSync(path.resolve(currentDir, "./patentModel.js"), "utf8");
    const appSource = readFileSync(appPath, "utf8");

    expect(patentSource).not.toContain("当前 P1 注册表尚未覆盖该空间");
    expect(patentSource).toContain("当前空间需要补充信息，已转交专业人员复核");
    expect(appSource).not.toContain("风险报告和方案建议已生成");
    expect(appSource).toContain("查看需确认事项");
  });

  it("uses a new session schema after the patent-alignment migration", () => {
    const appSource = readFileSync(appPath, "utf8");

    expect(appSource).toContain('const demoStorageKey = "zhihui-aging-demo:v7"');
    expect(appSource).toContain("communityUserPosts");
    expect(appSource).not.toContain('const demoStorageKey = "zhihui-aging-demo:v6"');
  });

  it("uses concise safety-display wording at the user boundary", () => {
    const appSource = readFileSync(appPath, "utf8");
    const logicSource = readFileSync(path.resolve(currentDir, "./logic.js"), "utf8");
    const dataSource = readFileSync(path.resolve(currentDir, "./demoData.js"), "utf8");

    expect(patentBaseline).toMatchObject({
      sourceCommit: "00677a0280ad08d496ac3a5a00238f9ef44ebc8b",
      a7ImplementationCommit: "372f34f",
      displayVersion: "P1-DISPLAY-1.0",
      p2SourceCommit: "65aa0989e791142c77aa21cbd3d262e96f544e84"
    });
    expect(appSource).toContain("安全分");
    expect(appSource).toContain("越高越安全");
    expect(`${appSource}\n${logicSource}\n${dataSource}`).not.toContain("演示");
    expect(appSource).not.toContain("{report.riskValue}");
    [
      "39→83",
      "32→91",
      "安全等级",
      "中安全",
      "安全分提升到51",
      "改造后安全分51",
      "风险降低51%",
      "真实测量安全分"
    ].forEach((copy) => expect(appSource).not.toContain(copy));
  });

  it("keeps legacy score references out of production and bans them in design guidance", () => {
    const readme = readFileSync(path.resolve(currentDir, "../README.md"), "utf8");
    const design = readFileSync(path.resolve(currentDir, "../DESIGN.md"), "utf8");
    const productionSource = [
      readFileSync(appPath, "utf8"),
      readFileSync(path.resolve(currentDir, "./logic.js"), "utf8"),
      readFileSync(path.resolve(currentDir, "./demoData.js"), "utf8")
    ].join("\n");

    expect(productionSource).not.toContain("39→83");
    expect(productionSource).not.toContain("32→91");
    expect(readme).not.toContain("39→83");
    expect(readme).not.toContain("32→91");
    expect(design).toContain("页面不得展示 39→83、32→91 等历史分值");
  });

  it("allows completed capture views to be retaken before analysis", () => {
    const appSource = readFileSync(appPath, "utf8");
    const scanSource = appSource.slice(
      appSource.indexOf("function ScanScreen"),
      appSource.indexOf("function AnalysisScreen")
    );

    expect(scanSource).toContain("retakeTask");
    expect(scanSource).toContain("重拍");
    expect(scanSource).toContain("setCompletedTasks((current) => current.filter");
  });

  it("shows before-and-after imagery only when the same-space comparison is verified", () => {
    const appSource = readFileSync(appPath, "utf8");
    const verifiedCases = sampleCases.filter((caseItem) => caseItem.comparisonVerified);
    const pendingCases = sampleCases.filter((caseItem) => !caseItem.comparisonVerified);

    expect(verifiedCases).toHaveLength(1);
    expect(verifiedCases[0].space).toBe("bathroom");
    expect(existsSync(path.join(publicDir, verifiedCases[0].comparisonImage))).toBe(true);
    pendingCases.forEach((caseItem) => {
      expect(caseItem).not.toHaveProperty("beforeImage");
      expect(caseItem).not.toHaveProperty("afterImage");
      expect(caseItem.status).toBe("待同空间复扫");
    });
    expect(appSource).toContain("comparison-pending-state");
    expect(appSource).toContain("完成同空间复扫后生成对比");
    expect(appSource).not.toContain("sampleCase?.beforeImage");
    expect(appSource).not.toContain("sampleCase?.afterImage");
  });

  it("provides actionable supplement and professional review controls for pending results", () => {
    const appSource = readFileSync(appPath, "utf8");

    expect(appSource).toContain("补充采集");
    expect(appSource).toContain("申请人工复核");
    expect(appSource).toContain("选择复核方式");
    expect(appSource).toContain("视频复核");
    expect(appSource).toContain("上门复核");
    expect(appSource).toContain("提交复核申请");
    expect(appSource).toContain("复核申请已记录");
    expect(appSource).toContain("申请已提交");
    expect(appSource).toContain("查看复核进度");
    expect(appSource).toContain("复核处理进度");
    expect(appSource).toContain("重新生成评估结果");
    expect(appSource).toContain("修改预约");
  });

  it("shows patent-formula safety scores after registered-space review is completed", () => {
    const bedroom = buildPostReviewSafetyProjection({ spaceId: "bedroom", profile: e01Profile });
    const corridor = buildPostReviewSafetyProjection({ spaceId: "corridor", profile: e01Profile });

    expect(bedroom).toMatchObject({
      before: 75,
      after: 90,
      beforeRisk: 25,
      afterRisk: 10,
      riskTier: "中",
      afterRiskTier: "低",
      calculationVersion: "P1-CALC-1.0",
      reviewState: "completed",
      requiresRescanConfirmation: true
    });
    expect(corridor).toMatchObject({
      before: 68,
      after: 90,
      beforeRisk: 32,
      afterRisk: 10,
      riskTier: "中",
      afterRiskTier: "低"
    });
    ["kitchen", "living", "balcony"].forEach((spaceId) => {
      expect(buildPostReviewSafetyProjection({ spaceId, profile: e01Profile })).toBeNull();
    });
  });

  it("validates community drafts and builds a post with the selected fields", () => {
    const emptyDraft = { title: "  ", content: "", topic: "share", space: "living" };
    const draft = {
      title: "  卫生间扶手怎么选  ",
      content: "  想确认墙体是否可以安装。  ",
      topic: "question",
      space: "bathroom",
      imageData: "data:image/png;base64,abc"
    };

    expect(isCommunityPostDraftValid(emptyDraft)).toBe(false);
    expect(isCommunityPostDraftValid(draft)).toBe(true);
    expect(createCommunityPost(draft, {
      id: "post_local_test",
      publishedAt: "2026-07-18T09:00:00.000Z",
      badge: "改造提问"
    })).toMatchObject({
      id: "post_local_test",
      topic: "question",
      space: "bathroom",
      title: "卫生间扶手怎么选",
      content: "想确认墙体是否可以安装。",
      badge: "改造提问",
      images: ["data:image/png;base64,abc"]
    });
  });

  it("gives community interaction buttons readable names", () => {
    const appSource = readFileSync(appPath, "utf8");
    const communitySource = appSource.slice(
      appSource.indexOf("function CommunityScreen"),
      appSource.indexOf("function formatPostTime")
    );

    expect(communitySource).toContain('aria-label={`点赞 ${post.likes}`}');
    expect(communitySource).toContain('aria-label={`评论 ${post.comments}`}');
    expect(communitySource).toContain('aria-label={`收藏 ${post.saves}`}');
  });

  it("exposes analysis progress without announcing every percentage change", () => {
    const appSource = readFileSync(appPath, "utf8");
    const styles = readFileSync(stylesPath, "utf8");
    const analysisSource = appSource.slice(
      appSource.indexOf("function AnalysisScreen"),
      appSource.indexOf("function ReportScreen")
    );

    expect(analysisSource).toContain('role="progressbar"');
    expect(analysisSource).toContain('aria-valuenow={analysisProgress}');
    expect(analysisSource).not.toContain('analysis-command-center ${analysisComplete ? "complete" : ""}`} aria-live');
    expect(getCssRule(styles, ".progress-rail button")).toContain("min-height: 44px");
  });

  it("groups recommendations by risk and keeps additional options collapsed", () => {
    const appSource = readFileSync(appPath, "utf8");
    const matchSource = appSource.slice(
      appSource.indexOf("function MatchScreen"),
      appSource.indexOf("function MallScreen")
    );

    expect(matchSource).toContain("recommendationGroups");
    expect(matchSource).toContain("recommendation-group");
    expect(matchSource).toContain('rank === 0 ? "优先候选" : "备选动作"');
    expect(matchSource).toContain("对应风险");
    expect(matchSource).toContain("改造动作");
    expect(matchSource).toContain("安装条件");
    expect(matchSource).toContain("确认状态");
    expect(matchSource).toContain("预算");
    expect(matchSource).toContain("查看其余");
    expect(matchSource).toContain("reviewTasks");
    expect(matchSource).toContain("需要现场确认");
  });

  it("keeps patent internals out of the user-facing report and matching copy", () => {
    const appSource = readFileSync(appPath, "utf8");
    const reportAndMatchSource = appSource.slice(
      appSource.indexOf("function ReportScreen"),
      appSource.indexOf("function MallScreen")
    );

    [
      "已通过 P1 正式发布门",
      "P2 输入门已通过",
      "published · point · trace valid · review_flag=false",
      "T/S/E/V/K/C",
      "映射来源",
      "证据闭包",
      "不计算 0.50/0.30/0.20",
      "免人工复核",
      "硬约束已通过",
      "正式候选"
    ].forEach((copy) => expect(reportAndMatchSource).not.toContain(copy));
    expect(reportAndMatchSource).toContain("老人情况 × 空间风险");
    expect(reportAndMatchSource).toContain("适配条件已核对，施工前仍需现场确认");
    expect(reportAndMatchSource).toContain("assessment.reasons ??");
  });

  it("calculates rescan safety comparisons with the patent risk formula", () => {
    expect(calculatePatentRiskValue({
      T: 0.8,
      S: 0.7,
      E: 0.5,
      V: 0.6875,
      K: 1.2,
      C: 1
    })).toMatchObject({
      rawRisk: 48.72,
      riskValueOrInterval: { kind: "point", value: 49 },
      riskTier: "中"
    });

    const comparison = buildRescanSafetyComparison({
      spaceId: "bathroom",
      profile: e01Profile,
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

    expect(comparison).toMatchObject({
      before: 51,
      after: 88,
      beforeRisk: 49,
      afterRisk: 12,
      scoreDirection: "higher_is_safer",
      calculationVersion: "P1-CALC-1.0",
      displayVersion: "P1-DISPLAY-1.0",
      readOnly: true
    });
    expect(buildRescanSafetyComparison({
      spaceId: "kitchen",
      profile: e01Profile,
      before: {},
      after: {}
    })).toBeNull();
    expect(buildRescanSafetyComparison({
      spaceId: "bathroom",
      profile: e01Profile,
      before: { ...comparison, resultState: "published" },
      after: { ...comparison, resultState: "published" }
    })).toBeNull();
  });

  it("shows a patent-calculated plan projection instead of an unexplained coverage ratio", () => {
    const appSource = readFileSync(appPath, "utf8");
    const assessment = calculatePatentRiskAssessment({ spaceId: "bathroom", profile: e01Profile });
    const projection = buildPlanSafetyProjection({
      assessment,
      profile: e01Profile,
      actionIds: ["demo_action_antislip_coating"]
    });

    expect(projection).toMatchObject({
      before: 51,
      after: 88,
      beforeRisk: 49,
      afterRisk: 12,
      projectionState: "plan_estimate",
      requiresRescanConfirmation: true
    });
    expect(buildPlanSafetyProjection({
      assessment,
      profile: e01Profile,
      actionIds: []
    })).toBeNull();
    expect(appSource).toContain("改造后预估");
    expect(appSource).toContain("已选 {selectedProducts.length} 项改造措施");
    expect(appSource).not.toContain("已覆盖风险项");
    expect(appSource).not.toContain("覆盖率仅表示");
  });

  it("shows calculated before-and-after safety scores only for completed registered-space rescans", () => {
    const appSource = readFileSync(appPath, "utf8");
    const bathroomCase = getCaseBySpace(sampleCases, "bathroom");
    const rescanCases = communityPosts.filter((post) => post.topic === "case");

    expect(bathroomCase).not.toHaveProperty("beforeRisk");
    expect(bathroomCase).not.toHaveProperty("afterRisk");
    expect(bathroomCase).not.toHaveProperty("taskEvaluations");
    expect(bathroomCase).not.toHaveProperty("experienceScores");
    expect(rescanCases).toHaveLength(2);
    expect(rescanCases.every((post) => post.space === "bathroom")).toBe(true);
    expect(rescanCases.map((post) => [
      post.safetyComparison.before,
      post.safetyComparison.after
    ])).toEqual([[51, 88], [52, 89]]);
    rescanCases.forEach((post) => {
      expect(post.rescanStatus).toBe("复扫完成");
      expect(post.safetyComparison.before).toBeGreaterThanOrEqual(0);
      expect(post.safetyComparison.after).toBeLessThanOrEqual(100);
      expect(post.safetyComparison.after).toBeGreaterThan(post.safetyComparison.before);
      expect(post.safetyComparison.calculationVersion).toBe("P1-CALC-1.0");
      expect(post.safetyComparison.displayVersion).toBe("P1-DISPLAY-1.0");
      expect(post.safetyComparison.readOnly).toBe(true);
      expect([post.safetyComparison.before, post.safetyComparison.after]).not.toEqual([39, 83]);
    });
    communityPosts.forEach((post) => {
      expect(post).not.toHaveProperty("beforeRisk");
      expect(post).not.toHaveProperty("afterRisk");
      if (post.topic !== "case") expect(post).not.toHaveProperty("safetyComparison");
    });
    expect(appSource).not.toContain("feedback-loop-panel");
    expect(appSource).not.toContain("feedback-step-track");
    expect(appSource).toContain("rescan-state");
    expect(appSource).toContain("rescan-score-comparison");
    expect(appSource).toContain("安全分越高越安全");
    expect(appSource).not.toContain("持续优化AI算法");
  });
});
