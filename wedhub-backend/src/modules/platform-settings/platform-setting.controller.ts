import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import * as platformSettingService from "./platform-setting.service";
import type { UpdateSettingBody } from "./platform-setting.schema";
import type { PlatformSettingKeyType } from "./platform-setting.constants";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function listSettings(_req: Request, res: Response): Promise<void> {
  const settings = await platformSettingService.listAllSettings();
  res.json(successResponse(settings));
}

export async function updateSetting(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as UpdateSettingBody;
  const key = req.params.key as PlatformSettingKeyType;
  const updated = await platformSettingService.setNumericSetting(key, body.value, userId);
  res.json(successResponse(updated));
}
