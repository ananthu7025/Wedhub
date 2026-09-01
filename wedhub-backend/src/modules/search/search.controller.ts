import type { Request, Response } from "express";
import { paginatedResponse } from "../../common/utils/api-response.util";
import * as searchService from "./search.service";
import type { SearchVendorsQuery } from "./search.schema";

export async function searchVendors(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as SearchVendorsQuery;
  const { vendors, total } = await searchService.searchVendors(query, req.user?.id);
  res.json(
    paginatedResponse(vendors, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }),
  );
}
