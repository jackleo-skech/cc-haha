import { useMemo } from 'react'
import { MarkdownRenderer } from '../markdown/MarkdownRenderer'
import { MessageActionBar } from './MessageActionBar'
import { InlineImageGallery } from './InlineImageGallery'
import { useSessionRuntimeStore } from '../../stores/sessionRuntimeStore'
import { useSettingsStore } from '../../stores/settingsStore'

type Props = {
  content: string
  isStreaming?: boolean
  sessionId?: string | null
  translatedContent?: string
}

export function AssistantMessage({ content, isStreaming, sessionId, translatedContent }: Props) {
  if (!content.trim()) return null

  const documentLayout = shouldUseDocumentLayout(content)

  const modelId = useSessionRuntimeStore((s) =>
    sessionId ? s.selections[sessionId]?.modelId : undefined,
  )
  const currentModelName = useSettingsStore((s) => s.currentModel?.name ?? null)
  const modelName = useMemo(() => {
    if (modelId) return modelId
    if (currentModelName) return currentModelName
    return null
  }, [modelId, currentModelName])

  return (
    <div className="group mb-5 -ml-11 flex w-[calc(100%+44px)] justify-start gap-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)]">
        <span className="material-symbols-outlined text-[18px] text-[var(--color-text-secondary)]">smart_toy</span>
      </div>

      <div
        data-message-shell="assistant"
        data-layout={documentLayout ? 'document' : 'bubble'}
        className={`flex min-w-0 flex-col items-start gap-2 w-full ${
          documentLayout
            ? 'w-full max-w-full'
            : 'w-full max-w-[88%] sm:max-w-[80%] lg:max-w-[72%]'
        }`}
      >
        {modelName && (
          <span className="ml-1 text-xs font-medium text-[var(--color-text-tertiary)]">{modelName}</span>
        )}

        <div className={`rounded-[20px] rounded-tl-[8px] border border-[var(--color-border)]/60 bg-[var(--color-surface-container-lowest)] px-4 py-3 text-sm text-[var(--color-text-primary)] shadow-sm ${
          documentLayout ? 'w-full' : 'max-w-full'
        }`}>
          <MarkdownRenderer content={content} variant={documentLayout ? 'document' : 'default'} />
          {!isStreaming && <InlineImageGallery text={content} />}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-shimmer bg-[var(--color-brand)] align-text-bottom" />
          )}
        </div>

        {translatedContent && (
          <div className="rounded-[20px] rounded-tl-[8px] border border-[var(--color-border)]/60 bg-[var(--color-surface-container-low)] px-4 py-3 text-sm text-[var(--color-text-secondary)] shadow-sm">
            <MarkdownRenderer content={translatedContent} variant={documentLayout ? 'document' : 'default'} />
          </div>
        )}

        <MessageActionBar
          copyText={isStreaming ? undefined : content}
          copyLabel="Copy reply"
          align="start"
        />
      </div>
    </div>
  )
}

function shouldUseDocumentLayout(content: string) {
  const normalized = content.trim()
  if (!normalized) return false

  if (/```/.test(normalized)) return true
  if (/^\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|\|.+\|)/m.test(normalized)) return true

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  return paragraphs.length >= 2 || normalized.split('\n').filter((line) => line.trim()).length >= 8
}
