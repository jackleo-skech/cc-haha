import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

const mocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  listSessions: vi.fn(),
  getRepositoryContext: vi.fn(),
  getMessages: vi.fn(),
  getSlashCommands: vi.fn(),
  listSkills: vi.fn(),
  search: vi.fn(),
  browse: vi.fn(),
  getTasksForList: vi.fn(),
  resetTaskList: vi.fn(),
  wsClearHandlers: vi.fn(),
  wsConnect: vi.fn(),
  wsOnMessage: vi.fn(),
  wsSend: vi.fn(),
  wsDisconnect: vi.fn(),
  dialogOpen: vi.fn(),
  webviewDragHandlers: [] as Array<(event: { payload: unknown }) => void>,
  webviewUnlisten: vi.fn(),
  isMobile: false,
  isTauriRuntime: false,
}))

vi.mock('../api/sessions', () => ({
  sessionsApi: {
    create: mocks.createSession,
    list: mocks.listSessions,
    getRepositoryContext: mocks.getRepositoryContext,
    getMessages: mocks.getMessages,
    getSlashCommands: mocks.getSlashCommands,
  },
}))

vi.mock('../api/skills', () => ({
  skillsApi: {
    list: mocks.listSkills,
  },
}))

vi.mock('../api/filesystem', () => ({
  filesystemApi: {
    search: mocks.search,
    browse: mocks.browse,
  },
}))

vi.mock('../api/cliTasks', () => ({
  cliTasksApi: {
    getTasksForList: mocks.getTasksForList,
    resetTaskList: mocks.resetTaskList,
  },
}))

vi.mock('../api/websocket', () => ({
  wsManager: {
    clearHandlers: mocks.wsClearHandlers,
    connect: mocks.wsConnect,
    onMessage: mocks.wsOnMessage,
    send: mocks.wsSend,
    disconnect: mocks.wsDisconnect,
  },
}))

vi.mock('../hooks/useMobileViewport', () => ({
  useMobileViewport: () => mocks.isMobile,
}))

vi.mock('../lib/desktopRuntime', () => ({
  isTauriRuntime: () => mocks.isTauriRuntime,
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: mocks.dialogOpen,
}))

vi.mock('@tauri-apps/api/webview', () => ({
  getCurrentWebview: () => ({
    onDragDropEvent: vi.fn(async (handler: (event: { payload: unknown }) => void) => {
      mocks.webviewDragHandlers.push(handler)
      return mocks.webviewUnlisten
    }),
  }),
}))

vi.mock('../components/shared/DirectoryPicker', () => ({
  DirectoryPicker: ({ value, onChange }: { value: string; onChange: (path: string) => void }) => (
    <button type="button" aria-label="Pick project" data-value={value} onClick={() => onChange('/workspace/project')}>
      Pick project
    </button>
  ),
}))

vi.mock('../components/controls/PermissionModeSelector', () => ({
  PermissionModeSelector: ({ compact }: { compact?: boolean }) => (
    <button type="button" data-testid="permission-mode-selector" data-compact={compact ? 'true' : 'false'}>
      Bypass
    </button>
  ),
}))

vi.mock('../components/controls/ModelSelector', () => ({
  ModelSelector: ({ compact }: { compact?: boolean }) => (
    <button type="button" data-testid="model-selector" data-compact={compact ? 'true' : 'false'}>
      Model
    </button>
  ),
}))

import { EmptySession } from './EmptySession'
import { useChatStore } from '../stores/chatStore'
import { useSessionRuntimeStore } from '../stores/sessionRuntimeStore'
import { useSessionStore } from '../stores/sessionStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useTabStore } from '../stores/tabStore'
import { useUIStore } from '../stores/uiStore'
import { usePluginStore } from '../stores/pluginStore'

describe('EmptySession', () => {
  const initialSessionState = useSessionStore.getInitialState()
  const initialChatState = useChatStore.getInitialState()
  const initialTabState = useTabStore.getInitialState()
  const initialRuntimeState = useSessionRuntimeStore.getInitialState()
  const initialUiState = useUIStore.getInitialState()
  const initialPluginState = usePluginStore.getInitialState()

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.webviewDragHandlers.length = 0
    mocks.isMobile = false
    mocks.isTauriRuntime = false
    useSettingsStore.setState({ locale: 'en', activeProviderName: null })
    useSessionStore.setState(initialSessionState, true)
    useChatStore.setState(initialChatState, true)
    useTabStore.setState(initialTabState, true)
    useSessionRuntimeStore.setState(initialRuntimeState, true)
    useUIStore.setState(initialUiState, true)
    usePluginStore.setState(initialPluginState, true)

    mocks.createSession.mockResolvedValue({ sessionId: 'draft-session' })
    mocks.listSessions.mockResolvedValue({
      sessions: [{
        id: 'draft-session',
        title: 'New Session',
        createdAt: '2026-05-01T00:00:00.000Z',
        modifiedAt: '2026-05-01T00:00:00.000Z',
        messageCount: 0,
        projectPath: '/workspace/project',
        workDir: '/workspace/project',
        workDirExists: true,
      }],
      total: 1,
    })
    mocks.getMessages.mockResolvedValue({ messages: [] })
    mocks.getSlashCommands.mockResolvedValue({ commands: [] })
    mocks.listSkills.mockResolvedValue({ skills: [] })
    mocks.search.mockResolvedValue({
      currentPath: '/workspace/project',
      parentPath: null,
      query: '',
      entries: [],
    })
    mocks.getTasksForList.mockResolvedValue({ tasks: [] })
    mocks.resetTaskList.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
    useSessionStore.setState(initialSessionState, true)
    useChatStore.setState(initialChatState, true)
    useTabStore.setState(initialTabState, true)
    useSessionRuntimeStore.setState(initialRuntimeState, true)
    useUIStore.setState(initialUiState, true)
    usePluginStore.setState(initialPluginState, true)
  })

  function getComposerPanel(): HTMLElement {
    const textarea = screen.getByRole('textbox')
    const panel = textarea.closest('.glass-panel')
    if (!panel) throw new Error('Could not find composer panel (.glass-panel)')
    return panel as HTMLElement
  }

  function getHiddenFileInput(): HTMLInputElement {
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')
    if (!input) throw new Error('Could not find hidden file input')
    return input
  }

  it('shows default (non-compact) composer controls', () => {
    render(<EmptySession />)

    expect(screen.getByTestId('permission-mode-selector')).toHaveAttribute('data-compact', 'false')
    expect(screen.getByTestId('model-selector')).toHaveAttribute('data-compact', 'false')
  })

  it('loads slash commands on mount', async () => {
    mocks.listSkills.mockResolvedValueOnce({
      skills: [
        {
          name: 'draw:render',
          description: 'Render with the drawing plugin.',
          userInvocable: true,
        },
      ],
    })

    render(<EmptySession />)

    await waitFor(() => {
      expect(mocks.listSkills).toHaveBeenCalledTimes(1)
    })
  })

  it('shows filtered slash commands when typing slash prefix', async () => {
    mocks.listSkills.mockResolvedValueOnce({
      skills: [
        {
          name: 'superpowers:brainstorming',
          description: 'Creative work planning.',
          userInvocable: true,
        },
        {
          name: 'agent-team-orchestrator',
          description: 'Agent Teams can use Subagent orchestration.',
          userInvocable: true,
        },
      ],
    })

    render(<EmptySession />)

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement

    fireEvent.change(textarea, {
      target: { value: '/su', selectionStart: 3 },
    })

    await waitFor(() => {
      const commandButtons = screen
        .getAllByRole('button')
        .filter((button) => button.textContent?.startsWith('/'))
      expect(commandButtons.length).toBeGreaterThan(0)
    })
  })

  it('stores and replays a draft runtime only when the user explicitly selected one', async () => {
    useSessionRuntimeStore.getState().setSelection('__draft__', {
      providerId: 'provider-explicit',
      modelId: 'model-explicit',
    })

    render(<EmptySession />)

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'draft question', selectionStart: 14 },
    })

    fireEvent.click(screen.getByRole('button', { name: /Run/i }))

    await waitFor(() => {
      expect(mocks.createSession).toHaveBeenCalledWith({})
    })

    expect(useSessionRuntimeStore.getState().selections['draft-session']).toEqual({
      providerId: 'provider-explicit',
      modelId: 'model-explicit',
    })
    expect(useSessionRuntimeStore.getState().selections['__draft__']).toBeUndefined()
    expect(mocks.wsSend.mock.calls.slice(0, 2)).toEqual([
      [
        'draft-session',
        {
          type: 'set_runtime_config',
          providerId: 'provider-explicit',
          modelId: 'model-explicit',
        },
      ],
      ['draft-session', { type: 'prewarm_session' }],
    ])
  })

  it('creates a session when submitted with input', async () => {
    render(<EmptySession />)

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'draft question', selectionStart: 14 },
    })
    fireEvent.click(screen.getByRole('button', { name: /Run/i }))

    await waitFor(() => {
      expect(mocks.createSession).toHaveBeenCalledWith({})
    })

    expect(useTabStore.getState().activeTabId).toBe('draft-session')
    expect(useChatStore.getState().sessions['draft-session']?.messages.slice(-1)[0]).toMatchObject({
      type: 'user_text',
      content: 'draft question',
    })
    expect(mocks.wsSend).toHaveBeenCalledWith('draft-session', {
      type: 'user_message',
      content: 'draft question',
      attachments: [],
    })
    expect(mocks.wsConnect).toHaveBeenCalledWith('draft-session')
    expect(useSessionRuntimeStore.getState().selections['draft-session']).toBeUndefined()
  })

  it('creates a session with workDir when a project is picked', async () => {
    render(<EmptySession />)

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'draft question', selectionStart: 14 },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Pick project' }))

    await waitFor(() => {
      expect(mocks.createSession).toHaveBeenCalledWith({ workDir: '/workspace/project' })
    })

    expect(useTabStore.getState().activeTabId).toBe('draft-session')
  })

  it('handles file selection via hidden file input', async () => {
    render(<EmptySession />)

    const fileInput = getHiddenFileInput()
    const file = new File(['file content'], 'test-file.log', { type: 'text/plain' })

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } })
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    expect(await screen.findByText('test-file.log')).toBeInTheDocument()
  })

  it('handles file drop on the composer panel', async () => {
    render(<EmptySession />)

    const panel = getComposerPanel()
    const file = new File(['file content'], 'dropped-file.txt', { type: 'text/plain' })
    const dataTransfer = { files: [file] }

    await act(async () => {
      fireEvent.drop(panel, { dataTransfer })
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    expect(await screen.findByText('dropped-file.txt')).toBeInTheDocument()
  })

  it('shows FileSearchMenu when typing @ trigger', async () => {
    mocks.search.mockResolvedValueOnce({
      currentPath: '/workspace/project',
      parentPath: null,
      query: '',
      entries: [
        { name: 'README.md', path: '/workspace/project/README.md', isDirectory: false },
      ],
    })

    render(<EmptySession />)

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(textarea, {
      target: { value: '@readme', selectionStart: 7 },
    })

    expect(await screen.findByText('README.md')).toBeInTheDocument()
  })

  it('opens file picker from the plus menu in native desktop', () => {
    mocks.isTauriRuntime = true

    render(<EmptySession />)

    fireEvent.click(screen.getByLabelText('Open composer tools'))
    expect(screen.getByText('Add files or photos')).toBeInTheDocument()
  })

  it('keeps Run disabled when input is empty and no attachments', () => {
    render(<EmptySession />)

    expect(screen.getByRole('button', { name: /Run/i })).toBeDisabled()
  })

  it('enables Run after typing text', () => {
    render(<EmptySession />)

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'hello' },
    })

    expect(screen.getByRole('button', { name: /Run/i })).not.toBeDisabled()
  })

  it('dismisses the plus menu when clicking outside', async () => {
    render(<EmptySession />)

    fireEvent.click(screen.getByLabelText('Open composer tools'))
    expect(screen.getByText('Add files or photos')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)

    await waitFor(() => {
      expect(screen.queryByText('Add files or photos')).not.toBeInTheDocument()
    })
  })
})
