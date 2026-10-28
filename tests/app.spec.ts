import { expect, test, type Page } from "@playwright/test";
async function prepare(page: Page) {
  await page.getByLabel("年龄", { exact: true }).fill("75");
  for (const [label, value] of [
    ["居住情况", "独居"],
    ["行动方式", "使用手杖"],
    ["视力情况", "弱光下视物困难"],
    ["平衡情况", "平衡能力受限"],
    ["跌倒经历", "有跌倒经历"],
    ["夜间活动", "起夜频繁"],
  ])
    await page
      .getByRole("combobox", { name: label, exact: true })
      .selectOption(value);
  await page.getByLabel("本空间每日使用次数", { exact: true }).fill("4");
  await page.getByRole("button", { name: "选择评估空间" }).click();
  await page.getByRole("button", { name: /卫生间/ }).click();
  await page.getByRole("button", { name: "进入引导采集" }).click();
}
async function checkLayout(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator("img")
      .evaluateAll((images) =>
        images.every((image) => image.complete && image.naturalWidth > 0),
      ),
  ).toBe(true);
}
for (const width of [375, 393, 768, 1280])
  test(`core flow at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width < 640 ? 852 : 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByText(/开发样例模式/)).toBeVisible();
    await checkLayout(page);
    await page.screenshot({
      path: testInfo.outputPath(`profile-${width}.png`),
      fullPage: true,
    });
    await prepare(page);
    for (let index = 0; index < 4; index++)
      await page.getByRole("button", { name: "记录当前样例视角" }).click();
    await page.getByRole("button", { name: "开始分析" }).click();
    await expect(
      page.getByRole("heading", { name: "卫生间评估报告" }),
    ).toBeVisible();
    await expect(page.getByLabel("当前安全分")).toContainText("51");
    await checkLayout(page);
    await page.screenshot({
      path: testInfo.outputPath(`report-${width}.png`),
      fullPage: true,
    });
    await page.getByRole("button", { name: "选择改造方案" }).click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "预览方案" }).click();
    await page.getByRole("button", { name: "确认当前清单" }).click();
    await expect(
      page.getByText("清单已保存在本机", { exact: true }),
    ).toBeVisible();
    await page
      .locator("img")
      .evaluateAll((images) =>
        Promise.all(images.map((image) => image.decode())),
      );
    await checkLayout(page);
    await page.screenshot({
      path: testInfo.outputPath(`plan-${width}.png`),
      fullPage: true,
    });
    await page.reload();
    await expect(
      page.getByText("清单已保存在本机", { exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
test("production build cannot fall back to samples", async ({ page }) => {
  await page.goto("http://127.0.0.1:35174");
  await expect(page.getByText(/真实服务模式/)).toBeVisible();
  await prepare(page);
  await page.getByRole("button", { name: "采集当前视角" }).click();
  await expect(page.getByRole("alert")).toContainText("服务未接入");
  await expect(page.getByRole("button", { name: "开始分析" })).toBeDisabled();
  await expect(page.getByLabel("当前安全分")).toHaveCount(0);
});
