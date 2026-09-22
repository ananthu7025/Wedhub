import { ValidationError } from "../../common/errors";
import * as platformSettingRepository from "./platform-setting.repository";
import { PLATFORM_SETTING_FALLBACKS, PlatformSettingKey, type PlatformSettingKeyType } from "./platform-setting.constants";

export async function getNumericSetting(key: PlatformSettingKeyType): Promise<number> {
  const row = await platformSettingRepository.findByKey(key);
  if (row && typeof row.value === "number") return row.value;
  return PLATFORM_SETTING_FALLBACKS[key];
}

export async function setNumericSetting(key: PlatformSettingKeyType, value: number, updatedByUserId: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new ValidationError("Setting value must be a non-negative number");
  }
  if (!Object.values(PlatformSettingKey).includes(key)) {
    throw new ValidationError(`Unknown setting key: ${key}`);
  }
  return platformSettingRepository.upsert(key, value, updatedByUserId);
}

export async function listAllSettings() {
  const keys = Object.values(PlatformSettingKey);
  const values = await Promise.all(keys.map((key) => getNumericSetting(key)));
  return keys.map((key, i) => ({ key, value: values[i] }));
}
