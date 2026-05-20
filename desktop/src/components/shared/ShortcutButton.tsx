type Props = {
  icon: string
  tooltip: string
  onClick: () => void
}

export default function ShortcutButton({ icon, tooltip, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className="inline-flex h-7 w-7 items-center justify-center rounded border border-[var(--color-border)]/50 bg-transparent text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-brand)]/35 hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/35"
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
    </button>
  )
}