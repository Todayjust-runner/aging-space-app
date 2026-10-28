// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { createServices } from "../services";

beforeEach(() => localStorage.clear());
async function prepare() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("年龄"), "75");
  for (const [label, value] of [
    ["居住情况", "独居"],
    ["行动方式", "使用手杖"],
    ["视力情况", "弱光下视物困难"],
    ["平衡情况", "平衡能力受限"],
    ["跌倒经历", "有跌倒经历"],
    ["夜间活动", "起夜频繁"],
  ])
    await user.selectOptions(screen.getByLabelText(label), value);
  await user.type(screen.getByLabelText("本空间每日使用次数"), "4");
  await user.click(screen.getByRole("button", { name: "选择评估空间" }));
  await user.click(screen.getByRole("button", { name: /卫生间/ }));
  await user.click(screen.getByRole("button", { name: "进入引导采集" }));
  return user;
}
async function collect() {
  const user = await prepare();
  for (let i = 0; i < 4; i++) {
    const button = await screen.findByRole("button", {
      name: "记录当前样例视角",
    });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
  }
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "开始分析" })).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "开始分析" }));
  return user;
}
describe("core assessment flow", () => {
  it("collects sample views, displays report, selects and confirms a plan", async () => {
    render(<App services={createServices("mock")} />);
    expect(screen.getByText(/开发样例模式/)).toBeInTheDocument();
    const user = await collect();
    expect(
      await screen.findByRole("heading", { name: "卫生间评估报告" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("当前安全分")).toHaveTextContent("51");
    await user.click(screen.getByRole("button", { name: "选择改造方案" }));
    expect(screen.getByRole("button", { name: "预览方案" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "预览方案" }));
    await user.click(screen.getByRole("button", { name: "确认当前清单" }));
    expect(screen.getByText("清单已保存在本机")).toBeInTheDocument();
  });
  it("re-evaluates saved inputs on reload and invalidates the report on retake", async () => {
    const view = render(<App services={createServices("mock")} />);
    await collect();
    await screen.findByRole("heading", { name: "卫生间评估报告" });
    view.unmount();
    render(<App services={createServices("mock")} />);
    await screen.findByRole("heading", { name: "卫生间评估报告" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "补充或重拍" }));
    await user.click(
      screen.getByRole("button", { name: "重拍：拍摄卫生间整体空间" }),
    );
    expect(screen.getByRole("button", { name: "开始分析" })).toBeDisabled();
    expect(screen.queryByLabelText("当前安全分")).not.toBeInTheDocument();
  });
  it("does not offer sample capture or scores in api mode", async () => {
    render(<App services={createServices("api")} />);
    const user = await prepare();
    expect(
      screen.queryByRole("button", { name: "记录当前样例视角" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "采集当前视角" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("服务未接入");
    expect(screen.queryByLabelText("当前安全分")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始分析" })).toBeDisabled();
  });
  it("shows assessment failure with retry instead of manufacturing a report", async () => {
    const services = createServices("mock");
    render(
      <App
        services={{
          ...services,
          assessment: {
            analyze: async () => {
              throw Error("网络中断");
            },
          },
        }}
      />,
    );
    const user = await collect();
    expect(await screen.findByRole("alert")).toHaveTextContent("网络中断");
    expect(screen.queryByLabelText("当前安全分")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "重试分析" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("网络中断"),
    );
  });
});
