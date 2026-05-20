/**
 * LiteLLM Config 解析服务
 *
 * 从 lite-llm/config.yaml 解析模型列表，返回按分类组织的模型目录。
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export type ModelCatalogEntry = {
  id: string
  name: string
  litellmModel: string
  category: string
}

export type ModelCategory = {
  id: string
  name: string
  models: ModelCatalogEntry[]
}

export type ModelCatalogResponse = {
  categories: ModelCategory[]
  total: number
  configPath: string
}

function inferCategory(modelName: string): { id: string; name: string } {
  const normalized = modelName.toLowerCase()

  const categoryMap: Record<string, string> = {
    'minimax-': 'minimax', 'minimax/': 'minimax',
    'kimi-': 'kimi', 'kimi/': 'kimi',
    'moonshot': 'moonshot',
    'glm-': 'glm', 'chatglm': 'glm', 'zhipu': 'glm',
    'deepseek': 'deepseek',
    'siliconflow/deepseek': 'deepseek',
    'vanchin/deepseek': 'deepseek',
    'llama-': 'llama', 'meta-llama': 'llama',
    'baichuan': 'other', 'farui': 'other', 'gui-plus': 'other', 'tongyi-': 'other',
    'claude': 'claude', 'sonnet': 'claude', 'haiku': 'claude', 'opus': 'claude', 'best': 'claude',
    'qwen3': 'qwen3',
    'qwen': 'qwen',
    'qvq': 'qvq', 'qwq': 'qvq',
    'math': 'math',
    'coder': 'coder',
  }

  for (const [prefix, category] of Object.entries(categoryMap)) {
    if (normalized.startsWith(prefix) || normalized.includes(prefix)) {
      const nameMap: Record<string, string> = {
        minimax: 'MiniMax', kimi: 'Kimi', moonshot: 'Moonshot',
        glm: 'GLM', deepseek: 'DeepSeek', llama: 'Llama',
        claude: 'Claude', qwen3: 'Qwen 3', qwen: 'Qwen',
        qvq: 'QVQ', math: 'Math', coder: 'Coder',
        other: 'Other', siliconflow: 'SiliconFlow', vanchin: 'Vanchin',
        baichuan: 'Baichuan', tongyi: 'Tongyi', farui: 'Farui', gui: 'GUI',
      }
      return { id: category, name: nameMap[category] || category }
    }
  }

  return { id: 'other', name: 'Other' }
}

const MODEL_NAME_PATTERN = /^\s*-\s*model_name:\s*(.+?)\s*$/

function parseModelNames(content: string): string[] {
  const names: string[] = []
  for (const line of content.split('\n')) {
    const match = line.match(MODEL_NAME_PATTERN)
    if (match) {
      const value = match[1]!.trim().replace(/^['"]|['"]$/g, '')
      if (value && !names.includes(value)) {
        names.push(value)
      }
    }
  }
  return names
}

const SUPPLEMENTAL_MODELS = [
  'qvq-max-2025-03-25','qwen-math-turbo','qwen3-vl-235b-a22b-thinking','qwen-coder-turbo-0919',
  'qwen2.5-vl-72b-instruct','qwen-vl-plus-2025-05-07','qwen2.5-math-7b-instruct','qwen3-vl-32b-thinking',
  'qwen-plus-2025-07-28','qwen-vl-plus-latest','qwen2.5-vl-3b-instruct','deepseek-r1-distill-qwen-7b',
  'glm-5','qwen-mt-flash','qwen2.5-14b-instruct','qwen3-vl-30b-a3b-thinking','qwen-vl-ocr-latest',
  'qwen2.5-7b-instruct','qwen3-32b','qwen-vl-max-2025-08-13','deepseek-r1-distill-qwen-32b',
  'qwen-vl-plus','qwen-coder-plus-latest','qwen3.5-35b-a3b','qwen-max-2025-01-25',
  'glm-4.5-air','qwen3-coder-480b-a35b-instruct','qwen3-coder-plus','qwen3-vl-8b-thinking',
  'qwen-vl-ocr-1028','qwen3.5-flash-2026-02-23','qwen3-vl-flash-2025-10-15','qwen3-max-preview',
  'qwen2.5-14b-instruct-1m','qwen3-8b','qwen-plus-0112','gui-plus','qwen-math-plus',
  'qwen3-0.6b','qvq-max','qwen3-coder-flash','qwen-vl-plus-2025-08-15','qwen2.5-coder-14b-instruct',
  'qwen-vl-max-latest','qwen3-next-80b-a3b-thinking','qwen3.5-27b','qwen-math-turbo-0919',
  'tongyi-xiaomi-analysis-flash','deepseek-r1','qvq-plus-latest','qwen3-vl-flash',
  'qwen-math-plus-0919','qwen3-14b','qwen-turbo-latest','qwen2.5-32b-instruct','MiniMax-M2.5',
  'qwen-plus-2025-12-01','qwen3-max-2025-09-23','qwen-plus-character','qwen-flash-character',
  'MiniMax-M2.1','deepseek-r1-distill-qwen-14b','qwen-math-turbo-latest','qwen3-30b-a3b-instruct-2507',
  'qvq-max-latest','qwen-flash','qwen-flash-2025-07-28','qwen3-235b-a22b-instruct-2507',
  'qwen3-coder-plus-2025-07-22','kimi-k2.5','qwen-vl-ocr','qwen2.5-coder-32b-instruct',
  'qwen-long-latest','qwen-max-0428','qwen-vl-ocr-2025-04-13','qwen-plus-1220','qwen-coder-plus-1106',
  'qwen3.5-122b-a10b','qwen-vl-ocr-2025-11-20','qwen-vl-max-2025-04-02','qwen-vl-max-1119',
  'qwen-vl-max-2025-04-08','tongyi-intent-detect-v3','qwen-vl-max-1230','qwen2.5-7b-instruct-1m',
  'qwen3.5-plus-2026-02-15','qvq-plus-2025-05-15','qwen3-235b-a22b-thinking-2507','glm-5.1',
  'qwen2.5-vl-7b-instruct','kimi-k2-thinking','qwq-plus-latest','qwen-vl-plus-0102',
  'deepseek-v3.1','qwen3.5-397b-a17b','qwen3-vl-plus-2025-09-23','deepseek-v3.2','qwen3-coder-next',
  'qwen-math-plus-0816','tongyi-xiaomi-analysis-pro','qwen3.5-flash','qwen3-vl-32b-instruct',
  'qwen-turbo-2025-04-28','qwen3-235b-a22b','qwen2.5-vl-72b-instruct-1m','qwen-coder-plus',
  'qwen-plus-latest','qwen-max-latest','qwen3-vl-plus','qwen3-vl-235b-a22b-instruct',
  'qwen3-vl-8b','qwen3-14b-instruct','qwen3-30b-a3b','qwen3-32b-instruct','qwen3-8b-instruct',
  'qwen-max','qwen-plus','qwen-turbo','qwen-coder-turbo','qwen-mt-plus','qwen-mt-turbo',
  'deepseek-v3','deepseek-r1-distill-llama-70b','deepseek-r1-distill-qwen-1.5b',
  'glm-4','glm-4-air','glm-4-airx','glm-4-flash','glm-4v','glm-4v-flash','glm-zero-preview',
  'kimi-k2','kimi-k2-0711','moonshot-v1-8k','moonshot-v1-32k','moonshot-v1-128k',
  'baichuan2-turbo','baichuan4','baichuan3-turbo','tongyi-lingma','siliconflow/deepseek-r1',
  'siliconflow/deepseek-v3','vanchin/deepseek-r1','vanchin/deepseek-v3',
]

function dedup(arr: string[]): string[] {
  return [...new Set(arr)]
}

export function resolveLiteLLMConfigPath(): string {
  const localPath = join(process.cwd(), 'lite-llm', 'config.yaml')
  if (existsSync(localPath)) {
    return localPath
  }
  return localPath
}

export function loadModelCatalog(): ModelCatalogResponse {
  const configPath = resolveLiteLLMConfigPath()
  const allModelNames: string[] = []

  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8')
      allModelNames.push(...parseModelNames(content))
    } catch {
      // ignore read errors
    }
  }

  allModelNames.push(...SUPPLEMENTAL_MODELS)

  const uniqueModelNames = dedup(allModelNames)

  const categoryMap = new Map<string, ModelCategory>()

  for (const modelName of uniqueModelNames) {
    const { id, name } = inferCategory(modelName)

    if (!categoryMap.has(id)) {
      categoryMap.set(id, { id, name, models: [] })
    }

    categoryMap.get(id)!.models.push({
      id: modelName,
      name: modelName.replace(/-/g, ' '),
      litellmModel: modelName,
      category: id,
    })
  }

  const priority = ['claude', 'qwen3', 'qwen', 'qvq', 'coder', 'deepseek', 'glm', 'kimi', 'minimax', 'moonshot']
  const categories = Array.from(categoryMap.values()).sort((a, b) => {
    const aIdx = priority.indexOf(a.id)
    const bIdx = priority.indexOf(b.id)
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
    if (aIdx !== -1) return -1
    if (bIdx !== -1) return 1
    return a.name.localeCompare(b.name)
  })

  const total = categories.reduce((sum, cat) => sum + cat.models.length, 0)

  return { categories, total, configPath }
}