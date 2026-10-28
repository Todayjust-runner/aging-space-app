import type { Profile } from "../../services/contracts";
export const emptyProfile: Profile = {
  age: "",
  living: "",
  mobility: "",
  vision: "",
  grip: "",
  assistance: "",
  balance: "",
  fallHistory: "",
  night: "",
  spaceUseFrequency: "",
  focus: "",
  notes: "",
};
export const profileOptions = {
  living: ["独居", "与家人同住", "白天独处"],
  mobility: ["正常行走", "使用手杖", "使用助行器", "轮椅辅助", "需他人协助"],
  vision: ["日常视物正常", "弱光下视物困难", "视力明显受限"],
  balance: ["平衡能力正常", "平衡能力受限"],
  fallHistory: ["未报告跌倒", "有跌倒经历"],
  night: ["很少起夜", "偶尔起夜", "起夜频繁", "夜间需照护"],
};
export function sanitizeProfile(value: unknown): Profile {
  const result = { ...emptyProfile };
  if (!value || typeof value !== "object") return result;
  for (const key of Object.keys(result) as (keyof Profile)[]) {
    const text = (value as Record<string, unknown>)[key];
    if (typeof text === "string")
      result[key] = text.trim().slice(0, key === "notes" ? 120 : 40);
  }
  for (const key of Object.keys(
    profileOptions,
  ) as (keyof typeof profileOptions)[]) {
    if (!(profileOptions[key] as readonly string[]).includes(result[key]))
      result[key] = "";
  }
  return result;
}
export function isProfileComplete(profile: Profile): boolean {
  return (
    Number(profile.age) >= 55 &&
    Number(profile.age) <= 100 &&
    Number.isInteger(Number(profile.age)) &&
    profile.spaceUseFrequency.trim() !== "" &&
    Number(profile.spaceUseFrequency) >= 0 &&
    Number(profile.spaceUseFrequency) <= 100 &&
    Object.keys(profileOptions).every((key) =>
      (
        profileOptions[key as keyof typeof profileOptions] as readonly string[]
      ).includes(profile[key as keyof Profile]),
    )
  );
}
