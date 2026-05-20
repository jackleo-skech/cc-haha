import type { UIAttachment } from '../../types/chat'
import { AttachmentGallery } from './AttachmentGallery'
import { MessageActionBar } from './MessageActionBar'

type Props = {
  content: string
  attachments?: UIAttachment[]
  onRewind?: () => void
  rewindLabel?: string
}

export function UserMessage({ content, attachments, onRewind, rewindLabel }: Props) {
  const hasText = content.trim().length > 0

  return (
    <div className="group mb-5 flex justify-end gap-3">
      <div
        data-message-shell="user"
        className="flex min-w-0 w-full max-w-[82%] flex-col items-end gap-2 sm:max-w-[78%] lg:max-w-[72%]"
      >
        {attachments && attachments.length > 0 && (
          <AttachmentGallery attachments={attachments} variant="message" />
        )}

        {hasText && (
          <div
            className="min-w-0 max-w-full bg-[var(--color-surface-user-msg)] px-4 py-3 text-sm leading-relaxed text-[var(--color-text-primary)] whitespace-pre-wrap break-words"
            style={{
              borderRadius: '18px 4px 18px 18px',
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            {content}
          </div>
        )}

        {hasText && (
          <MessageActionBar
            copyText={content}
            copyLabel="Copy prompt"
            onRewind={onRewind}
            rewindLabel={rewindLabel}
            align="end"
          />
        )}
      </div>

      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)]">
        <span className="material-symbols-outlined text-[18px]">person</span>
      </div>
    </div>
  )
}
