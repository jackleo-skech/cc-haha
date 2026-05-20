import { useState } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useUIStore } from '../../stores/uiStore'
import { useTranslation } from '../../i18n'
import { StatsPanel } from '../stats/StatsPanel'
import { PromptsPanel } from '../prompts/PromptsPanel'
import { ModelSelector } from '../settings/ModelSelector'

export function Header() {
  const t = useTranslation()
  const { locale, setLocale, theme, setTheme, currentModel } = useSettingsStore()
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const [showStats, setShowStats] = useState(false)
  const [showPrompts, setShowPrompts] = useState(false)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'zh' : 'en')
  }

  const selectTheme = (newTheme: 'light' | 'dark' | 'cool') => {
    setTheme(newTheme)
    setShowThemeMenu(false)
  }

  const modelName = currentModel?.name || currentModel?.id || t('header.selectModel')
  const selectedCount = useSettingsStore((s) => s.selectedModels.length)
  const modelLabel = selectedCount > 1
    ? `${modelName} +${selectedCount - 1}`
    : modelName.length > 18
      ? modelName.slice(0, 16) + '...'
      : modelName

  return (
    <>
      <header className="flex h-10 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowPrompts(true)}
            className="flex h-7 items-center rounded px-2 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
            title={t('header.prompts')}
          >
            <span className="material-symbols-outlined mr-1 text-[14px]">text_format</span>
            {t('header.prompts')}
          </button>
          <button
            onClick={() => setShowStats(true)}
            className="flex h-7 items-center rounded px-2 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
            title={t('header.stats')}
          >
            <span className="material-symbols-outlined mr-1 text-[14px]">bar_chart</span>
            {t('header.stats')}
          </button>
          <button
            onClick={() => setShowModelSelector(true)}
            className="flex h-7 items-center rounded-md border border-[var(--color-border)] px-2 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
            title={t('header.model')}
          >
            <span className="material-symbols-outlined mr-1 text-[14px] text-[var(--color-brand)]">dns</span>
            {modelLabel}
            <span className="material-symbols-outlined ml-1 text-[14px] text-[var(--color-text-tertiary)]">expand_more</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleLocale}
            className="flex h-7 w-7 items-center justify-center rounded text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
            title={locale === 'en' ? 'Switch to Chinese' : 'Switch to English'}
          >
            {locale === 'en' ? '中' : 'EN'}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
              title={t('header.theme')}
            >
              <span className="material-symbols-outlined text-[16px]">
                {theme === 'light' ? 'light_mode' : theme === 'dark' ? 'dark_mode' : 'water'}
              </span>
            </button>
            {showThemeMenu && (
              <div className="absolute right-0 top-full mt-1 w-32 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] shadow-[var(--shadow-dropdown)] py-1 z-50">
                <button
                  onClick={() => selectTheme('light')}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-[var(--color-surface-hover)] ${theme === 'light' ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-secondary)]'}`}
                >
                  <span className="material-symbols-outlined text-[14px]">light_mode</span>
                  {t('header.lightMode')}
                </button>
                <button
                  onClick={() => selectTheme('cool')}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-[var(--color-surface-hover)] ${theme === 'cool' ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-secondary)]'}`}
                >
                  <span className="material-symbols-outlined text-[14px]">water</span>
                  {t('header.coolMode')}
                </button>
                <button
                  onClick={() => selectTheme('dark')}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-[var(--color-surface-hover)] ${theme === 'dark' ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-secondary)]'}`}
                >
                  <span className="material-symbols-outlined text-[14px]">dark_mode</span>
                  {t('header.darkMode')}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={toggleSidebar}
            className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
            title={t('sidebar.toggle')}
          >
            <span className="material-symbols-outlined text-[16px]">menu</span>
          </button>
        </div>
      </header>

      <ModelSelector
        open={showModelSelector}
        onClose={() => setShowModelSelector(false)}
      />
      <StatsPanel open={showStats} onClose={() => setShowStats(false)} />
      <PromptsPanel open={showPrompts} onClose={() => setShowPrompts(false)} />
    </>
  )
}