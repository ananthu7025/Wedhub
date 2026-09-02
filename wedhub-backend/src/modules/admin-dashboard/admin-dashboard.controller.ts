import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import * as adminDashboardService from "./admin-dashboard.service";

export async function getDashboard(_req: Request, res: Response): Promise<void> {
  const metrics = await adminDashboardService.getDashboardMetrics();
  res.json(successResponse(metrics));
}
