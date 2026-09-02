import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import * as comparisonService from "./comparison.service";
import type { CompareVendorsQuery } from "./comparison.schema";

export async function compareVendors(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as CompareVendorsQuery;
  const result = await comparisonService.compareVendors(query.vendorIds, req.user?.id);
  res.json(successResponse(result));
}
