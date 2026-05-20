import { useState, useEffect } from 'react'
import { useTranslation } from '../../i18n'
import type { SessionUsageSnapshot } from '../../api/sessions'
import { sessionsApi } from '../../api/sessions'

type ModelUsage = {
  model: string
  displayName: string
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  costUSD: number
  costDisplay: string
}

type UsageSummary = {
  totalCostUSD: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCacheReadInputTokens: number
  totalCacheCreationInputTokens: number
  sessionCount: number
  modelBreakdown: ModelUsage[]
}

export function StatsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslation()
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    loadSummary()
  }, [open])

  const loadSummary = async () => {
    setIsLoading(true)
    try {
      const { sessions } = await sessionsApi.list({ limit: 100 })
      const usageMap = new Map<string, SessionUsageSnapshot>()

      await Promise.all(
        sessions.map(async (s) => {
          try {
            const inspection = await sessionsApi.getInspection(s.id)
            if (inspection.usage) {
              usageMap.set(s.id, inspection.usage)
            }
          } catch {
          }
        })
      )

      const modelMap = new Map<string, ModelUsage>()
      let totalCost = 0
      let totalInput = 0
      let totalOutput = 0
      let totalCacheRead = 0
      let totalCacheCreate = 0

      for (const usage of usageMap.values()) {
        totalCost += usage.totalCostUSD || 0
        totalInput += usage.totalInputTokens || 0
        totalOutput += usage.totalOutputTokens || 0
        totalCacheRead += usage.totalCacheReadInputTokens || 0
        totalCacheCreate += usage.totalCacheCreationInputTokens || 0

        for (const model of usage.models) {
          const existing = modelMap.get(model.model)
          if (existing) {
            existing.inputTokens += model.inputTokens || 0
            existing.outputTokens += model.outputTokens || 0
            existing.cacheReadInputTokens += model.cacheReadInputTokens || 0
            existing.cacheCreationInputTokens += model.cacheCreationInputTokens || 0
            existing.costUSD += model.costUSD || 0
          } else {
            modelMap.set(model.model, { ...model })
          }
        }
      }

      setSummary({
        totalCostUSD: totalCost,
        totalInputTokens: totalInput,
        totalOutputTokens: totalOutput,
        totalCacheReadInputTokens: totalCacheRead,
        totalCacheCreationInputTokens: totalCacheCreate,
        sessionCount: usageMap.size,
        modelBreakdown: Array.from(modelMap.values()).sort((a, b) => b.costUSD - a.costUSD),
      })
    } catch (error) {
      console.error('Failed to load usage summary:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
    return tokens.toString()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-[600px] flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            {t('statsPanel.title')}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-5 h-5 border-2 border-[var(--color-brand)] border-t-transparent rounded-full" />
            </div>
          ) : summary ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon="attach_money"
                  label={t('statsPanel.totalCost')}
                  value={`$${summary.totalCostUSD.toFixed(4)}`}
                  color="text-[var(--color-success)]"
                />
                <StatCard
                  icon="chat"
                  label={t('statsPanel.sessions')}
                  value={summary.sessionCount.toString()}
                  color="text-[var(--color-brand)]"
                />
                <StatCard
                  icon="input"
                  label={t('statsPanel.inputTokens')}
                  value={formatTokens(summary.totalInputTokens)}
                  color="text-[var(--color-text-primary)]"
                />
                <StatCard
                  icon="output"
                  label={t('statsPanel.outputTokens')}
                  value={formatTokens(summary.totalOutputTokens)}
                  color="text-[var(--color-text-primary)]"
                />
                <StatCard
                  icon="cached"
                  label={t('statsPanel.cacheRead')}
                  value={formatTokens(summary.totalCacheReadInputTokens)}
                  color="text-[var(--color-text-secondary)]"
                />
                <StatCard
                  icon="save"
                  label={t('statsPanel.cacheCreate')}
                  value={formatTokens(summary.totalCacheCreationInputTokens)}
                  color="text-[var(--color-text-secondary)]"
                />
              </div>

              {summary.modelBreakdown.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">
                    {t('statsPanel.byModel')}
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {summary.modelBreakdown.map((model) => (
                      <div
                        key={model.model}
                        className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs"
                      >
                        <span className="flex-1 truncate font-medium text-[var(--color-text-primary)]">
                          {model.displayName || model.model}
                        </span>
                        <span className="text-[var(--color-text-tertiary)]">
                          {formatTokens(model.inputTokens + model.outputTokens)} tokens
                        </span>
                        <span className="font-medium text-[var(--color-success)]">
                          ${model.costUSD.toFixed(4)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-[var(--color-text-tertiary)]">
              {t('statsPanel.noData')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string
  label: string
  value: string
  color: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-low)] px-3 py-2.5">
      <span className={`material-symbols-outlined text-[20px] ${color}`}>{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] text-[var(--color-text-tertiary)]">{label}</div>
        <div className={`text-sm font-semibold ${color}`}>{value}</div>
      </div>
    </div>
  )
}