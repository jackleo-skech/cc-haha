/**
 * Models Catalog API
 *
 * GET /api/models-catalog        — 获取完整分类模型列表
 * GET /api/models-catalog/search — 搜索模型
 */

import { loadModelCatalog, resolveLiteLLMConfigPath } from '../services/liteLLMConfigService.js'
import { ApiError, errorResponse } from '../middleware/errorHandler.js'

export async function handleModelsCatalogApi(
  req: Request,
  url: URL,
  segments: string[],
): Promise<Response> {
  try {
    const sub = segments[2]

    switch (sub) {
      case undefined:
        if (req.method !== 'GET') throw methodNotAllowed(req.method)
        return await handleCatalogList()

      case 'search':
        if (req.method !== 'GET') throw methodNotAllowed(req.method)
        return await handleCatalogSearch(url)

      default:
        throw ApiError.notFound(`Unknown models-catalog endpoint: ${sub}`)
    }
  } catch (error) {
    return errorResponse(error)
  }
}

async function handleCatalogList(): Promise<Response> {
  const catalog = loadModelCatalog()
  return Response.json(catalog)
}

async function handleCatalogSearch(url: URL): Promise<Response> {
  const query = url.searchParams.get('q')?.toLowerCase() || ''
  if (!query) {
    return await handleCatalogList()
  }

  const catalog = loadModelCatalog()
  const filteredCategories = catalog.categories
    .map((cat) => ({
      ...cat,
      models: cat.models.filter(
        (m) => m.id.toLowerCase().includes(query) || m.litellmModel.toLowerCase().includes(query)
      ),
    }))
    .filter((cat) => cat.models.length > 0)

  const total = filteredCategories.reduce((sum, cat) => sum + cat.models.length, 0)

  return Response.json({
    categories: filteredCategories,
    total,
    configPath: catalog.configPath,
  })
}

function methodNotAllowed(method: string): ApiError {
  return new ApiError(405, `Method ${method} not allowed`, 'METHOD_NOT_ALLOWED')
}