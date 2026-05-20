import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from '../../i18n'

type PromptTemplate = {
  id: string
  name: string
  content: string
  category: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'claude-haha-prompt-templates'

export function PromptsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslation()
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (!open) return
    loadTemplates()
  }, [open])

  const loadTemplates = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setTemplates(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const saveTemplates = (newTemplates: PromptTemplate[]) => {
    setTemplates(newTemplates)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTemplates))
    } catch (error) {
      console.error('Failed to save templates:', error)
    }
  }

  const handleCreate = () => {
    setIsCreating(true)
    setEditingTemplate({
      id: Date.now().toString(),
      name: '',
      content: '',
      category: 'general',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  const handleSave = (template: PromptTemplate) => {
    if (!template.name.trim() || !template.content.trim()) return

    const newTemplates = templates.some((t) => t.id === template.id)
      ? templates.map((t) => (t.id === template.id ? { ...template, updatedAt: new Date().toISOString() } : t))
      : [...templates, { ...template, id: Date.now().toString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]

    saveTemplates(newTemplates)
    setEditingTemplate(null)
    setIsCreating(false)
  }

  const handleDelete = (id: string) => {
    saveTemplates(templates.filter((t) => t.id !== id))
    if (editingTemplate?.id === id) {
      setEditingTemplate(null)
      setIsCreating(false)
    }
  }

  const handleUse = (content: string) => {
    navigator.clipboard.writeText(content).catch(console.error)
    onClose()
  }

  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category))
    return ['all', ...Array.from(cats)].sort()
  }, [templates])

  const filteredTemplates = useMemo(() => {
    let result = templates
    if (selectedCategory !== 'all') {
      result = result.filter((t) => t.category === selectedCategory)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      )
    }
    return result
  }, [templates, selectedCategory, searchQuery])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-[640px] flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            {t('promptsPanel.title')}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              className="flex h-7 items-center rounded-md px-2.5 text-xs font-medium text-[var(--color-brand)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <span className="material-symbols-outlined mr-1 text-[14px]">add</span>
              {t('promptsPanel.new')}
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5">
            <span className="material-symbols-outlined text-[16px] text-[var(--color-text-tertiary)]">search</span>
            <input
              type="text"
              placeholder={t('promptsPanel.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? t('promptsPanel.allCategories') : cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {filteredTemplates.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-text-tertiary)]">
              {isCreating ? t('promptsPanel.createHint') : t('promptsPanel.empty')}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2.5 transition-colors hover:border-[var(--color-border-focus)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        {template.name}
                      </span>
                      <span className="rounded bg-[var(--color-surface-container-high)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-tertiary)]">
                        {template.category}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-secondary)]">
                      {template.content}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      onClick={() => handleUse(template.content)}
                      className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-brand)]"
                      title={t('promptsPanel.use')}
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    </button>
                    <button
                      onClick={() => setEditingTemplate(template)}
                      className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                      title={t('common.rename')}
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-error)]"
                      title={t('common.delete')}
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editingTemplate && (
        <PromptEditor
          template={editingTemplate}
          onSave={handleSave}
          onClose={() => {
            setEditingTemplate(null)
            setIsCreating(false)
          }}
        />
      )}
    </div>
  )
}

function PromptEditor({
  template,
  onSave,
  onClose,
}: {
  template: PromptTemplate
  onSave: (template: PromptTemplate) => void
  onClose: () => void
}) {
  const t = useTranslation()
  const [name, setName] = useState(template.name)
  const [content, setContent] = useState(template.content)
  const [category, setCategory] = useState(template.category)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="flex w-[560px] flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {template.name ? t('promptsPanel.edit') : t('promptsPanel.new')}
          </h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-primary)]">
              {t('promptsPanel.name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('promptsPanel.namePlaceholder')}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-focus)]"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-primary)]">
              {t('promptsPanel.category')}
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t('promptsPanel.categoryPlaceholder')}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-focus)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-primary)]">
              {t('promptsPanel.content')}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('promptsPanel.contentPlaceholder')}
              rows={8}
              className="w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-focus)]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => onSave({ ...template, name, content, category })}
              disabled={!name.trim() || !content.trim()}
              className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}