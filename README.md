# 智绘适老 App 开发基础

从完整 Web 演示精简出的移动端核心流程。原演示仓库 `Batch-Li/web-demo` 保留不变；本仓库用于后续 Android App 和真实后端开发。

当前包含老人画像、空间选择、引导采集、异步分析、报告、方案推荐与本机确认。完整商城、社区、模拟手机外壳和无引用素材已移除。本轮没有 Android 工程、真实相机、语音、识图、账号或后端服务。

## 运行

使用 Node.js 22.12+（22 LTS）或 24 LTS，安装锁定依赖：

```sh
npm ci
npm run dev
```

开发地址通常为 http://localhost:5173 。开发环境默认使用明确标注的样例模式；填写完整画像后可走通流程。主要卫生间样例可使用：75 岁、独居、使用手杖、弱光下视物困难、平衡能力受限、有跌倒经历、起夜频繁、每日使用 4 次。该条件下样例安全分为 51，仅用于验证旧算法和流程。

## 模式与构建

| 命令 | 行为 |
| --- | --- |
| `npm run dev` | 默认 mock，仅使用内置样例 |
| `npm run dev -- --mode production` | 默认 api，显示真实服务未接入 |
| `npm run build` | 默认 api，根路径生产构建 |
| `npm run build:mock` | 显式选择 mock，生成样例预览 |
| `npm run build:mock -- --base=/aging-space-app/` | Pages 子路径样例构建 |
| `npm run preview` | 预览最近一次 dist 构建 |

`VITE_APP_MODE=mock` 或 `api` 可显式覆盖；未识别的非空模式按 api 处理。生产默认不会回退到样例。确认部署的是哪一种构建，不要把样例当成真实服务。

子路径构建在本机预览时也需要相同的 base：`npm run preview -- --base=/aging-space-app/`，然后访问 `/aging-space-app/`。

api 适配器目前明确返回 `SERVICE_NOT_CONFIGURED`，尚未定义或调用真实 HTTP 端点。前端环境变量会进入浏览器，不能保存云服务长期密钥。

## 目录职责

```text
src/app/                  应用入口、Context、reducer、进度与恢复
src/features/profile/     画像表单、字段清洗与完整性检查
src/features/capture/     空间选择、采集与重拍
src/features/report/      异步分析、错误与待复核报告
src/features/plan/        方案选择、预算与本机确认
src/components/           共享视图与资源路径解析
src/data/                 空间目录和采集任务定义
src/services/contracts.ts 平台无关的 TypeScript 服务契约
src/services/index.ts     模式选择、适配器注入与延迟加载
src/services/storage.ts   独立本机存储访问
src/services/mock/        固定证据、目录、旧 JS 样例算法与回归测试
src/styles/               基础样式
src/test/                 组件测试环境
 tests/                   浏览器流程与视口验收
```

页面通过 Context 使用服务，不能直接导入样例算法。接入真实后端时实现 AssessmentService 与 CaptureService，保持页面使用的归一化结果结构；服务端仍需进行权限与数据校验。

## 服务与状态

- `CaptureService.capture(spaceId, taskId)` 返回包含素材 ID、视角、空间、来源、URI 和时间的采集记录。样例适配器不打开相机。
- `AssessmentService.analyze(input, signal)` 接收画像、空间、全部采集记录和可选取消信号，返回带来源和状态的报告与方案候选。
- `SessionStorage` 提供 load、save、clear。当前实现使用 `aging-space-app:session:v1`，不会读取或清除旧演示存储。
- 返回、重拍、换空间、重新开始和异步结果统一由 reducer 处理。换输入后旧结果与已选方案失效，过期请求结果不覆盖新状态。
- 恢复进度时不信任存储中的分数，重新调用当前评估服务；方案选择在新结果中重新核对。
- 提交本机方案不会创建订单、预约或复核工单。待复核页面不会模拟复核完成，也不计算改造后预估安全分。
- 六类空间均保留采集要求；只有旧模型已登记且满足条件的样例可生成数值，缺失、冲突与未登记空间保持待复核。

旧样例算法完整移入 mock 目录，计算逻辑未改动。该算法不代表经真实照片验证的生产能力。业务数据、上传素材与研究样本库的管理见后续阶段文档。

## 验证

```sh
npm test
npm run typecheck
npm run build
```

浏览器验收需要先保留 api 生产构建，测试会启动独立的样例开发服务和生产预览服务：

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

已有 Microsoft Edge 时，PowerShell 可使用 `$env:PLAYWRIGHT_CHANNEL='msedge'` 后运行浏览器测试。截图与失败追踪保存在被 Git 忽略的 `test-results/`。

测试覆盖样例/真实模式隔离、画像和采集门控、过期结果、恢复、重拍、待复核、安装条件约束、旧样例数值及追溯校验。浏览器测试检查 375、393、768、1280 像素宽度的核心流程、图片和横向溢出，以及生产模式不会生成样例报告。

## CI 与预览

每次 push 或 PR 运行单元/组件测试、类型检查、生产构建和 Pages 子路径构建。浏览器验收可在本机按上述命令运行。

GitHub Pages 仅通过手动运行 `Publish sample preview manually` 工作流发布，预览明确使用 mock；需在仓库 Pages 设置中选择 GitHub Actions。本轮不自动发布，也不修改原演示仓库的地址或工作流。

## 下一步

建议 Android 优先，沿用 React + TypeScript + Vite，下一轮接入 Capacitor。随后依次完成真实拍照、后端用户与评估记录、卫生间真实评估、腾讯云语音、上门辅助扫描、试点城市补贴查询。

任务边界与验收标准详见 [第一阶段开发任务](docs/first-stage.md)，本次重构范围见 [重构记录](docs/refactor-plan.md)。素材记录见 [图片来源](public/assets/IMAGE_SOURCES.md)。
