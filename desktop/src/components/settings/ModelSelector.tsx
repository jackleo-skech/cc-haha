import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useTranslation } from '../../i18n'
import { api } from '../../api/client'

type ModelCatalogEntry = {
  id: string
  name: string
  litellmModel: string
  category: string
}

type ModelCategory = {
  id: string
  name: string
  models: ModelCatalogEntry[]
}

type ModelCatalogResponse = {
  categories: ModelCategory[]
  total: number
  configPath: string
}

export function ModelSelector({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const t = useTranslation()
  const { selectedModels, toggleModel, selectAllModels, currentModel } = useSettingsStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [catalog, setCatalog] = useState<ModelCatalogResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [selectAllFiltered, setSelectAllFiltered] = useState(false)
  const [testResults, setTestResults] = useState<Map<string, { success: boolean; latencyMs: number; error?: string; httpStatus?: number }>>(new Map())
  const [isTesting, setIsTesting] = useState(false)
  const [testProgress, setTestProgress] = useState<{ current: number; total: number } | null>(null)
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setIsLoading(true)
    setSearchQuery('')
    setSelectAllFiltered(false)
    setIsTesting(false)
    setTestProgress(null)
    api.get('/api/models-catalog')
      .then((data) => {
        const catalogData = data as ModelCatalogResponse
        setCatalog(catalogData)
        if (selectedModels.length) {
          const expanded = new Set<string>()
          catalogData.categories.forEach((cat) => {
            if (cat.models.some((m) => selectedModels.includes(m.id))) {
              expanded.add(cat.id)
            }
          })
          setExpandedCategories(expanded)
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
    api.get('/api/providers')
      .then((data: any) => setActiveProviderId(data.activeId))
      .catch(console.error)
  }, [open])

  useEffect(() => {
    if (!open) return
    try {
      const saved = localStorage.getItem('model-catalog-test-results')
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, { success: boolean; latencyMs: number; error?: string; httpStatus?: number }>
        setTestResults(new Map(Object.entries(parsed)))
      }
    } catch {}
  }, [open])

  const filteredCatalog = useMemo(() => {
    if (!catalog) return null
    if (!searchQuery) return catalog

    const q = searchQuery.toLowerCase()
    const filteredCategories = catalog.categories
      .map((cat) => ({
        ...cat,
        models: cat.models.filter(
          (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.models.length > 0)

    return {
      ...catalog,
      categories: filteredCategories,
      total: filteredCategories.reduce((sum, cat) => sum + cat.models.length, 0),
    }
  }, [catalog, searchQuery])

  const toggleCategory = useCallback((id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelectAllFiltered = useCallback(() => {
    if (!filteredCatalog) return
    if (selectAllFiltered) {
      if (currentModel) {
        selectAllModels([currentModel.id])
      } else {
        selectAllModels([])
      }
      setSelectAllFiltered(false)
    } else {
      const allFilteredIds = filteredCatalog.categories.flatMap((cat) => cat.models.map((m) => m.id))
      selectAllModels(allFilteredIds)
      setSelectAllFiltered(true)
      setExpandedCategories(new Set(filteredCatalog.categories.map((cat) => cat.id)))
    }
  }, [filteredCatalog, selectAllFiltered, currentModel, selectAllModels])

  const filteredCount = useMemo(() => {
    if (!filteredCatalog) return 0
    return filteredCatalog.categories.reduce((sum, cat) => sum + cat.models.length, 0)
  }, [filteredCatalog])

  const selectedFilteredCount = useMemo(() => {
    if (!filteredCatalog) return 0
    const filteredIds = new Set(filteredCatalog.categories.flatMap((cat) => cat.models.map((m) => m.id)))
    return selectedModels.filter((id: string) => filteredIds.has(id)).length
  }, [filteredCatalog, selectedModels])

  const handleCategorySelectAll = useCallback((catModels: ModelCatalogEntry[]) => {
    const catIds = catModels.map(m => m.id)
    const currentSet = new Set(selectedModels)
    const allSelected = catIds.every((id: string) => currentSet.has(id))

    if (allSelected) {
      selectAllModels(selectedModels.filter((id: string) => !catIds.includes(id)))
    } else {
      catIds.forEach((id: string) => currentSet.add(id))
      selectAllModels(Array.from(currentSet))
    }
  }, [selectedModels, selectAllModels])

  const handleTestSelected = useCallback(async () => {
    if (!activeProviderId || selectedModels.length === 0) return

    setIsTesting(true)
    setTestProgress({ current: 0, total: selectedModels.length })

    const newResults = new Map(testResults)
    const concurrency = 5
    const modelQueue = [...selectedModels]

    const testOneModel = async (modelId: string) => {
      try {
        const result = await api.post(
          `/api/providers/${activeProviderId}/test`,
          { modelId },
        ) as { result: { connectivity: { success: boolean; latencyMs: number; error?: string; httpStatus?: number } } }

        newResults.set(modelId, {
          success: result.result.connectivity.success,
          latencyMs: result.result.connectivity.latencyMs,
          error: result.result.connectivity.error,
          httpStatus: result.result.connectivity.httpStatus,
        })
      } catch (error) {
        newResults.set(modelId, {
          success: false,
          latencyMs: 0,
          error: error instanceof Error ? error.message : 'Test failed',
        })
      } finally {
        setTestProgress((prev) => prev ? { ...prev, current: prev.current + 1 } : null)
      }
    }

    while (modelQueue.length > 0) {
      const batch = modelQueue.splice(0, concurrency)
      await Promise.all(batch.map(testOneModel))
      setTestResults(new Map(newResults))
    }

    const obj: Record<string, { success: boolean; latencyMs: number; error?: string; httpStatus?: number }> = {}
    newResults.forEach((v, k) => { obj[k] = v })
    localStorage.setItem('model-catalog-test-results', JSON.stringify(obj))

    setIsTesting(false)
    setTestProgress(null)
  }, [activeProviderId, selectedModels, testResults])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-14" onClick={onClose}>
      <div
        className="flex w-[640px] max-h-[70vh] flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              {t('modelCatalog.title')}
            </h2>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
              {t('modelCatalog.multiSelectHint')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
              <span className="material-symbols-outlined text-[18px] text-[var(--color-text-tertiary)]">search</span>
              <input
                type="text"
                placeholder={t('modelCatalog.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectAllFiltered(false)
                }}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none"
                autoFocus
              />
            </div>
            <button
              onClick={handleSelectAllFiltered}
              className={`flex h-9 items-center rounded-lg px-3 text-xs font-medium transition-colors ${
                selectAllFiltered
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              {searchQuery
                ? `${selectAllFiltered ? t('modelCatalog.deselectAll') : t('modelCatalog.selectAllFiltered')} (${selectedFilteredCount}/${filteredCount})`
                : `${selectAllFiltered ? t('modelCatalog.deselectAll') : t('modelCatalog.selectAll')} (${selectedModels.length})`}
            </button>
          </div>

          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-5 h-5 border-2 border-[var(--color-brand)] border-t-transparent rounded-full" />
            </div>
          )}

          {!isLoading && filteredCatalog && (
            <div className="max-h-[400px] overflow-y-auto pr-1">
              {filteredCatalog.categories.length === 0 && (
                <div className="py-8 text-center text-sm text-[var(--color-text-tertiary)]">
                  {t('modelCatalog.noResults')}
                </div>
              )}
              {filteredCatalog.categories.map((cat) => {
                const isExpanded = expandedCategories.has(cat.id)
                const selectedInCategory = cat.models.filter((m) => selectedModels.includes(m.id)).length
                return (
                  <div key={cat.id} className="mb-2">
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedInCategory === cat.models.length}
                          ref={(el) => { if (el) el.indeterminate = selectedInCategory > 0 && selectedInCategory < cat.models.length }}
                          onChange={() => handleCategorySelectAll(cat.models)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-3.5 w-3.5 cursor-pointer"
                        />
                        {cat.name}
                        <span className="text-xs font-normal text-[var(--color-text-tertiary)]">
                          ({cat.models.length})
                        </span>
                        {selectedInCategory > 0 && (
                          <span className="rounded-full bg-[var(--color-brand)]/14 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-brand)]">
                            {selectedInCategory}
                          </span>
                        )}
                      </span>
                      <span className="material-symbols-outlined text-[18px] text-[var(--color-text-tertiary)] transition-transform">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="ml-2 border-l border-[var(--color-border)] pl-2">
                        {cat.models.map((model) => {
                          const isSelected = selectedModels.includes(model.id)
                          const testResult = testResults.get(model.id)
                          return (
                            <label
                              key={model.id}
                              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-[var(--color-brand)]/10'
                                  : 'hover:bg-[var(--color-surface-hover)]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleModel(model.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-3.5 w-3.5 cursor-pointer"
                              />
                              <span className={`flex-1 text-xs ${isSelected ? 'font-medium text-[var(--color-brand)]' : 'text-[var(--color-text-secondary)]'}`}>
                                {model.name}
                              </span>
                              {testResult && (
                                <span className={`text-[10px] font-medium ${
                                  testResult.success
                                    ? 'text-green-600'
                                    : 'text-red-500'
                                }`}>
                                  {testResult.success
                                    ? `✓ ${testResult.latencyMs}ms`
                                    : `✗ ${testResult.error?.substring(0, 25)}${(testResult.error?.length ?? 0) > 25 ? '…' : ''}`
                                  }
                                </span>
                              )}
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!isLoading && filteredCatalog && (
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestSelected}
                  disabled={isTesting || selectedModels.length === 0 || !activeProviderId}
                  className="flex items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className={`material-symbols-outlined text-[14px] ${isTesting ? 'animate-spin' : ''}`}>
                    {isTesting ? 'hourglass_empty' : 'science'}
                  </span>
                  {isTesting
                    ? `${testProgress?.current}/${testProgress?.total}`
                    : `${t('modelCatalog.test')} (${selectedModels.length})`
                  }
                </button>
                {testProgress && isTesting && (
                  <div className="w-20 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-brand)] transition-all duration-300"
                      style={{ width: `${(testProgress.current / testProgress.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
              <span className="text-xs text-[var(--color-text-tertiary)]">{t('modelCatalog.selectedCount', { count: selectedModels.length })}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}