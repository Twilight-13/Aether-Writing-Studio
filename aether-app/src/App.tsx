import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import './App.css'
import NotesWorkspace from './NotesWorkspace'
import Starfield from './Starfield'
import WritingWorkspace from './WritingWorkspace'
import PlanetAccent from './PlanetAccent'
import ExportModal from './ExportModal'
import { getDesktopApi } from './fallbackApi'
import {
  blockTypeLabels,
  buildFlatPages,
  collectDescendantIds,
  createEmptyBlock,
  getHeadingEntries,
  synchronizeChapterMetrics,
  type BlockType,
  type PageBlock,
  type PageDocument,
  type PageSummary,
  type PageVersion,
  type ProjectSummary,
  type ProjectType,
  typeLabels,
} from './models'

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(value),
  )
}

function App() {
  const desktopApi = useMemo(() => {
    const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI
    const api = isElectron ? (window as any).electronAPI : getDesktopApi()

    console.log('[Aether] API mode:', isElectron ? 'Electron IPC' : 'Fallback (in-memory)')

    if (!isElectron) {
      console.warn('[Aether] Running in browser fallback mode — data will not persist')
    }

    return api
  }, [])
  const latestVersionTimestampRef = useRef<number>(0)
  const saveInFlightRef = useRef(false)
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [pages, setPages] = useState<PageSummary[]>([])
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)
  const [activePageId, setActivePageId] = useState<number | null>(null)
  const [view, setView] = useState<'home' | 'workspace'>('home')
  const [showComposer, setShowComposer] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectType, setNewProjectType] = useState<ProjectType>('notes')
  const [newBlockType, setNewBlockType] = useState<BlockType>('paragraph')
  const [pageTitle, setPageTitle] = useState('')
  const [draftBlocks, setDraftBlocks] = useState<PageBlock[]>([])
  const [comments, setComments] = useState<PageDocument['comments']>([])
  const [versions, setVersions] = useState<PageVersion[]>([])
  const [selectedBlockKey, setSelectedBlockKey] = useState<string | null>(null)
  const [newCommentText, setNewCommentText] = useState('')
  const [saveMessage, setSaveMessage] = useState('Loading workspace...')
  const [isDirty, setIsDirty] = useState(false)
  const [draggingPageId, setDraggingPageId] = useState<number | null>(null)

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null
  const activePage = pages.find((p) => p.id === activePageId) ?? null
  const flatPages = useMemo(() => buildFlatPages(pages), [pages])
  const headingEntries = useMemo(() => getHeadingEntries(draftBlocks), [draftBlocks])
  const selectedBlock =
    draftBlocks.find((block) => block.blockKey === selectedBlockKey) ?? draftBlocks[0] ?? null
  const selectedBlockComments = comments.filter((comment) => comment.blockKey === selectedBlock?.blockKey)

  // Focus mode: F11 to enter, F11 or Escape to exit
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault()
        setFocusMode((v) => !v)
      } else if (e.key === 'Escape' && focusMode) {
        setFocusMode(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [focusMode])

  const applyPageDocument = (document: PageDocument) => {
    setPageTitle(document.page.title)
    setDraftBlocks(document.blocks)
    setComments(document.comments)
    setVersions(document.versions)
    setSelectedBlockKey((current) =>
      document.blocks.some((block) => block.blockKey === current) ? current : document.blocks[0]?.blockKey ?? null,
    )
    setSaveMessage('Workspace synced')
    setIsDirty(false)
    latestVersionTimestampRef.current = document.versions[0]
      ? new Date(document.versions[0].createdAt).getTime()
      : 0
  }

  useEffect(() => {
    let cancelled = false
    void desktopApi.projects.list().then((nextProjects) => {
      if (cancelled) return
      setProjects(nextProjects)
      const preferred =
        nextProjects.find((project) => project.type === 'novel') ??
        nextProjects.find((project) => project.type === 'story') ??
        nextProjects.find((project) => project.type === 'notes') ??
        nextProjects[0] ??
        null
      setActiveProjectId((current) => current ?? preferred?.id ?? null)
      setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [desktopApi])

  useEffect(() => {
    let cancelled = false

    if (!activeProject) {
      setPages([])
      setActivePageId(null)
      setDraftBlocks([])
      setComments([])
      setVersions([])
      setPageTitle('')
      setIsWorkspaceLoading(false)
      return () => {
        cancelled = true
      }
    }

    setIsWorkspaceLoading(true)
    void desktopApi.pages.list(activeProject.id).then((nextPages) => {
      if (cancelled) return
      setPages(nextPages)
      setActivePageId((current) => (nextPages.some((page) => page.id === current) ? current : nextPages[0]?.id ?? null))
      setIsWorkspaceLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [activeProject, desktopApi])

  useEffect(() => {
    let cancelled = false
    if (!activeProject || !activePageId) return undefined

    setIsWorkspaceLoading(true)
    void desktopApi.pages.get(activePageId).then((document) => {
      if (cancelled) return
      applyPageDocument(document)
      setIsWorkspaceLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [activePageId, activeProject, desktopApi])

  const saveCurrentPage = useCallback(async (createVersion: boolean) => {
    if (!activeProject || !activePageId || saveInFlightRef.current) return
    saveInFlightRef.current = true
    setSaveMessage('Saving changes...')
    try {
      const document = await desktopApi.pages.save({ pageId: activePageId, title: pageTitle, blocks: draftBlocks, createVersion })
      applyPageDocument(document)
      setPages((current) => current.map((page) => (page.id === document.page.id ? { ...page, title: document.page.title } : page)))
      setProjects((current) => current.map((project) => (project.id === activeProject.id ? { ...project, lastEditedAt: new Date().toISOString() } : project)))
    } finally {
      saveInFlightRef.current = false
    }
  }, [activePageId, activeProject, desktopApi, draftBlocks, pageTitle])

  useEffect(() => {
    if (!isDirty || !activeProject || !activePageId) return undefined
    const timeout = window.setTimeout(() => {
      const shouldSnapshot = Date.now() - latestVersionTimestampRef.current > 30000
      void saveCurrentPage(shouldSnapshot)
    }, 1200)
    return () => window.clearTimeout(timeout)
  }, [activePageId, activeProject, draftBlocks, isDirty, pageTitle, saveCurrentPage])

  const createProject = async () => {
    const trimmed = newProjectName.trim()
    if (!trimmed) return
    const created = await desktopApi.projects.create({ name: trimmed, type: newProjectType })
    setProjects((current) => [created, ...current])
    setActiveProjectId(created.id)
    setNewProjectName('')
    setNewProjectType('notes')
    setShowComposer(false)
  }

  const createPage = async (parentId: number | null) => {
    if (!activeProject) return
    const created = await desktopApi.pages.create({ projectId: activeProject.id, parentId, title: parentId === null ? 'New Page' : 'New Sub-page' })
    setPages(await desktopApi.pages.list(activeProject.id))
    setActivePageId(created.id)
  }

  const insertBlock = (type: BlockType, afterIndex?: number) => {
    const nextBlock = createEmptyBlock(type)
    setDraftBlocks((current) => {
      const blocks = [...current]
      if (typeof afterIndex === 'number') blocks.splice(afterIndex + 1, 0, nextBlock)
      else blocks.push(nextBlock)
      return synchronizeChapterMetrics(blocks)
    })
    setSelectedBlockKey(nextBlock.blockKey)
    setIsDirty(true)
    setSaveMessage('Unsaved changes')
  }

  const updateBlock = (blockKey: string, updater: (block: PageBlock) => PageBlock) => {
    setDraftBlocks((current) =>
      synchronizeChapterMetrics(
        current.map((block) => (block.blockKey === blockKey ? updater(block) : block)),
      ),
    )
    setIsDirty(true)
    setSaveMessage('Unsaved changes')
  }

  const moveBlock = (blockKey: string, direction: -1 | 1) => {
    setDraftBlocks((current) => {
      const index = current.findIndex((block) => block.blockKey === blockKey)
      const targetIndex = index + direction
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current
      const next = [...current]
      const [block] = next.splice(index, 1)
      next.splice(targetIndex, 0, block)
      return synchronizeChapterMetrics(next)
    })
    setIsDirty(true)
    setSaveMessage('Unsaved changes')
  }

  const deleteBlock = (blockKey: string) => {
    setDraftBlocks((current) => {
      const next = current.filter((block) => block.blockKey !== blockKey)
      return synchronizeChapterMetrics(next.length > 0 ? next : [createEmptyBlock('paragraph')])
    })
    setSelectedBlockKey((current) => (current === blockKey ? null : current))
    setIsDirty(true)
    setSaveMessage('Unsaved changes')
  }

  const movePage = async (targetPageId: number) => {
    if (!draggingPageId || !activeProject) return
    if (draggingPageId === targetPageId) return
    if (collectDescendantIds(pages, draggingPageId).has(targetPageId)) return
    setPages(await desktopApi.pages.move({ pageId: draggingPageId, targetPageId }))
    setDraggingPageId(null)
  }

  const addComment = async () => {
    if (!activePageId || !selectedBlock || !newCommentText.trim()) return
    const document = await desktopApi.pages.comment({ pageId: activePageId, blockKey: selectedBlock.blockKey, body: newCommentText })
    applyPageDocument(document)
    setNewCommentText('')
  }

  const restoreVersion = async (versionId: number) => {
    if (!activePageId) return
    setSaveMessage('Restoring version...')
    applyPageDocument(await desktopApi.pages.restoreVersion({ pageId: activePageId, versionId }))
  }

  const replaceDraftBlocks = (updater: (blocks: PageBlock[]) => PageBlock[]) => {
    setDraftBlocks((current) => synchronizeChapterMetrics(updater(current)))
    setIsDirty(true)
    setSaveMessage('Unsaved changes')
  }

  const outlinePage = pages.find((page) => page.title === 'Arc & Chapters Outline') ?? null
  const activePageIsCharacters = activePage?.title === 'Characters'
  const activePageIsLore = activePage?.title === 'Lore & History'
  const activePageIsOutline = activePage?.id === outlinePage?.id
  const activePageIsArc = activePage?.parentId === outlinePage?.id
  const addCharacter = () => replaceDraftBlocks((blocks) => [...blocks, createEmptyBlock('character-card')])
  const addLoreSection = () => replaceDraftBlocks((blocks) => [...blocks, createEmptyBlock('lore-section')])

  const addArc = async () => {
    if (!activeProject || !outlinePage || !activePageIsOutline) return

    const nextArcNumber =
      draftBlocks.filter((block) => block.type === 'arc-card').length + 1
    const created = await desktopApi.pages.create({
      projectId: activeProject.id,
      parentId: outlinePage.id,
      title: `Arc ${nextArcNumber} - New Arc`,
    })

    const arcBlocks = [
      {
        ...createEmptyBlock('story-section'),
        data: {
          label: 'Arc Overview',
          title: 'Arc overview',
          body: 'Describe how this arc changes the story.',
        },
      },
      {
        ...createEmptyBlock('story-section'),
        data: {
          label: 'Turning Points',
          title: 'Key plot turns',
          body: 'List the major shifts in this arc.',
        },
      },
      {
        ...createEmptyBlock('story-section'),
        data: {
          label: 'Character Dynamics',
          title: 'Who changes here',
          body: 'Track which character relationships evolve in this arc.',
        },
      },
    ]

    await desktopApi.pages.save({
      pageId: created.id,
      title: created.title,
      blocks: arcBlocks,
      createVersion: true,
    })

    setPages(await desktopApi.pages.list(activeProject.id))
    replaceDraftBlocks((blocks) => [
      ...blocks,
      {
        ...createEmptyBlock('arc-card'),
        data: {
          arcPageId: created.id,
          arcNumber: nextArcNumber,
          title: created.title.replace(/^Arc \d+ - /, ''),
          overview: 'Describe how this arc changes the story.',
          purpose: 'Explain what this arc establishes thematically and structurally.',
          emotion: 'Choose the emotional register for this arc.',
          chapters: [],
        },
      },
    ])
  }

  const addChapter = async () => {
    if (!activeProject || !activePage || !activePageIsArc) return

    const chapterCount =
      draftBlocks.filter((block) => block.type === 'chapter-link-card').length + 1
    const chapterTitle = `Chapter ${chapterCount} - New Chapter`
    const created = await desktopApi.pages.create({
      projectId: activeProject.id,
      parentId: activePage.id,
      title: chapterTitle,
    })

    const body = 'Draft the prose for this chapter here.'
    const chapterBlocks = synchronizeChapterMetrics([
      {
        ...createEmptyBlock('chapter-identity'),
        data: { chapterNumber: chapterCount, title: 'New Chapter' },
      },
      {
        ...createEmptyBlock('chapter-type'),
        data: { value: 'Transition' },
      },
      {
        ...createEmptyBlock('chapter-body'),
        data: { text: body },
      },
      {
        ...createEmptyBlock('key-points'),
        data: { items: 'Key event one\nKey event two' },
      },
      createEmptyBlock('chapter-length'),
    ])

    await desktopApi.savePage({
      pageId: created.id,
      title: chapterTitle,
      blocks: chapterBlocks,
      createVersion: true,
    })

    const linkBlock = {
      ...createEmptyBlock('chapter-link-card'),
      data: {
        chapterPageId: created.id,
        title: chapterTitle,
        synopsis: 'Add the one-line synopsis for this chapter.',
      },
    }

    replaceDraftBlocks((blocks) => [...blocks, linkBlock])

    if (outlinePage) {
      const outlineDocument = await desktopApi.pages.get(outlinePage.id)
      const updatedOutlineBlocks = outlineDocument.blocks.map((block) => {
        if (block.type !== 'arc-card' || Number(block.data.arcPageId) !== activePage.id) {
          return block
        }

        const chapters = Array.isArray(block.data.chapters)
          ? [...(block.data.chapters as Array<Record<string, unknown>>)]
          : []
        chapters.push({
          chapterPageId: created.id,
          title: chapterTitle,
          synopsis: 'Add the one-line synopsis for this chapter.',
        })

        return {
          ...block,
          data: {
            ...block.data,
            chapters,
          },
        }
      })

      await desktopApi.pages.save({
        pageId: outlinePage.id,
        title: outlineDocument.page.title,
        blocks: updatedOutlineBlocks,
        createVersion: false,
      })
    }

    setPages(await desktopApi.pages.list(activeProject.id))
  }

  // ── enter workspace ───────────────────────────────────────────────────────
  const openWorkspace = (projectId: number) => {
    setActiveProjectId(projectId)
    setView('workspace')
  }

  const goHome = () => {
    setView('home')
    setFocusMode(false)
  }

  const handleDeleteProject = async (projectId: number) => {
    if (!window.confirm('Permanently delete this project and all its pages? This cannot be undone.')) return
    await desktopApi.projects.delete(projectId)
    setProjects((prev) => prev.filter((p) => p.id !== projectId))
    if (activeProjectId === projectId) {
      setActiveProjectId(null)
      goHome()
    }
  }

  const handleDeletePage = async (pageId: number) => {
    await desktopApi.deletePage(pageId)
    setPages((prev) => prev.filter((p) => p.id !== pageId))
    if (activePageId === pageId) {
      setActivePageId(null)
      setDraftBlocks([])
      setComments([])
      setVersions([])
    }
  }

  // ── shared workspace JSX ──────────────────────────────────────────────────
  const workspaceJsx = activeProject ? (
    activeProject.type === 'notes' ? (
      <NotesWorkspace
        activeProject={activeProject}
        pages={flatPages}
        activePageId={activePageId}
        pageTitle={pageTitle}
        draftBlocks={draftBlocks}
        comments={comments}
        versions={versions}
        selectedBlockKey={selectedBlockKey}
        selectedBlockComments={selectedBlockComments}
        selectedBlockType={selectedBlock ? blockTypeLabels[selectedBlock.type] : 'Pick a block'}
        newBlockType={newBlockType}
        newCommentText={newCommentText}
        saveMessage={saveMessage}
        isWorkspaceLoading={isWorkspaceLoading}
        headingEntries={headingEntries}
        blockRefs={blockRefs}
        focusMode={focusMode}
        onSelectPage={setActivePageId}
        onCreatePage={(parentId) => void createPage(parentId)}
        onMovePage={(targetPageId) => void movePage(targetPageId)}
        onStartDragPage={setDraggingPageId}
        onTitleChange={(value) => { setPageTitle(value); setIsDirty(true); setSaveMessage('Unsaved changes') }}
        onNewBlockTypeChange={setNewBlockType}
        onInsertBlock={insertBlock}
        onSelectBlock={setSelectedBlockKey}
        onMoveBlock={moveBlock}
        onDeleteBlock={deleteBlock}
        onUpdateBlock={updateBlock}
        onSnapshot={() => void saveCurrentPage(true)}
        onCommentTextChange={setNewCommentText}
        onAddComment={() => void addComment()}
        onRestoreVersion={(versionId) => void restoreVersion(versionId)}
        onToggleFocusMode={() => setFocusMode((v) => !v)}
      />
    ) : (
      <WritingWorkspace
        activeProject={activeProject}
        pages={flatPages}
        activePageId={activePageId}
        pageTitle={pageTitle}
        draftBlocks={draftBlocks}
        comments={comments}
        versions={versions}
        selectedBlockKey={selectedBlockKey}
        selectedBlockComments={selectedBlockComments}
        selectedBlockType={selectedBlock ? blockTypeLabels[selectedBlock.type] : 'Pick a block'}
        newCommentText={newCommentText}
        saveMessage={saveMessage}
        isWorkspaceLoading={isWorkspaceLoading}
        headingEntries={headingEntries}
        blockRefs={blockRefs}
        focusMode={focusMode}
        canAddCharacter={activePageIsCharacters}
        canAddLoreSection={activePageIsLore}
        canAddArc={activePageIsOutline}
        canAddChapter={Boolean(activePageIsArc)}
        onSelectPage={setActivePageId}
        onMovePage={(targetPageId) => void movePage(targetPageId)}
        onStartDragPage={setDraggingPageId}
        onTitleChange={(value) => { setPageTitle(value); setIsDirty(true); setSaveMessage('Unsaved changes') }}
        onSelectBlock={setSelectedBlockKey}
        onMoveBlock={moveBlock}
        onDeleteBlock={deleteBlock}
        onUpdateBlocks={replaceDraftBlocks}
        onSnapshot={() => void saveCurrentPage(true)}
        onCommentTextChange={setNewCommentText}
        onAddComment={() => void addComment()}
        onRestoreVersion={(versionId) => void restoreVersion(versionId)}
        onAddCharacter={addCharacter}
        onAddLoreSection={addLoreSection}
        onAddArc={() => void addArc()}
        onAddChapter={() => void addChapter()}
        onToggleFocusMode={() => setFocusMode((v) => !v)}
        onDeletePage={(pageId) => void handleDeletePage(pageId)}
      />
    )
  ) : null

  // ── shared modal JSX ─────────────────────────────────────────────────────
  const modalsJsx = (
    <>
      {showComposer ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowComposer(false)}>
          <section className="composer-modal glass-panel" role="dialog" aria-modal="true" aria-label="Create project" onClick={(e) => e.stopPropagation()}>
            <div>
              <p className="panel-kicker">New Project</p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', marginTop: '0.2rem' }}>Launch a new writing universe.</h2>
            </div>
            <label className="field">
              <span>Project name</span>
              <input id="new-project-name-input" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Ash Choir" onKeyDown={(e) => { if (e.key === 'Enter') void createProject() }} autoFocus />
            </label>
            <label className="field">
              <span>Project type</span>
              <select id="new-project-type-select" value={newProjectType} onChange={(e) => setNewProjectType(e.target.value as ProjectType)}>
                <option value="notes">Normal Notes</option>
                <option value="novel">Novel / Series</option>
                <option value="story">Single Story</option>
              </select>
            </label>
            <div className="hero-actions">
              <button id="create-project-confirm-btn" className="primary-button" onClick={() => void createProject()}>Create</button>
              <button className="ghost-button" onClick={() => setShowComposer(false)}>Cancel</button>
            </div>
          </section>
        </div>
      ) : null}

      {showExport && activeProject ? (
        <ExportModal
          project={activeProject}
          pages={flatPages}
          getPageBlocks={async (pageId) => {
            const doc = await desktopApi.getPage(pageId)
            return doc.blocks
          }}
          onClose={() => setShowExport(false)}
        />
      ) : null}
    </>
  )

  // ═══════════════════════════════════════════════════════════════════════
  // HOME PAGE
  // ═══════════════════════════════════════════════════════════════════════
  if (view === 'home') {
    return (
      <div className="app-shell">
        <Starfield />
        <div className="nebula nebula-tl" aria-hidden="true" />
        <div className="nebula nebula-cr" aria-hidden="true" />
        <div className="nebula nebula-bl" aria-hidden="true" />

        <PlanetAccent type="gas-giant" size={110} style={{ position: 'fixed', bottom: '6rem', left: '1.5rem', zIndex: 1, opacity: 0.5 }} />
        <PlanetAccent type="blue-marble" size={60} style={{ position: 'fixed', top: '10rem', right: '2rem', zIndex: 1, opacity: 0.4 }} />
        <PlanetAccent type="dusty-red" size={42} style={{ position: 'fixed', top: '5rem', left: '42%', zIndex: 1, opacity: 0.28 }} />

        <main className="stage" style={{ maxWidth: '1200px', margin: '0 auto', minHeight: '100vh' }}>
          {/* Hero */}
          <section className="hero-panel">
            <div>
              <h1 className="hero-logo">Aether</h1>
              <p className="hero-subtitle">Writing Studio</p>
              <p className="hero-copy">Story overview, characters, lore, arc planning, chapter drafting — all in one local workspace.</p>
            </div>
            <div className="hero-actions">
              <button id="new-project-btn" className="primary-button" onClick={() => setShowComposer(true)}>+ New Project</button>
            </div>
          </section>

          {/* Project grid */}
          <section style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.25rem' }}>
              <div>
                <p className="panel-kicker" style={{ marginBottom: '0.2rem' }}>Project Dashboard</p>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem' }}>Your Universes</h2>
              </div>
              <span className="pill">{projects.length} active</span>
            </div>

            {isLoading ? (
              <div className="empty-state">Charting the starfield archive...</div>
            ) : projects.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✦</div>
                <p>No projects yet. Create your first universe above.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(22rem, 1fr))', gap: '1rem' }}>
                {projects.map((project) => (
                  <div
                    key={project.id}
                    style={{ position: 'relative' }}
                  >
                    <button
                      id={`project-card-${project.id}`}
                      className="project-card"
                      style={{ '--project-accent': project.accentColor, textAlign: 'left', width: '100%' } as CSSProperties}
                      onClick={() => openWorkspace(project.id)}
                    >
                      <div className="project-card-header">
                        <span className="project-icon">{project.icon}</span>
                        <span className="project-type">{typeLabels[project.type]}</span>
                      </div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', letterSpacing: '-0.01em', margin: '0.5rem 0 0.3rem' }}>{project.name}</h3>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', minHeight: '2.4em', lineHeight: 1.5 }}>{project.synopsis}</p>
                      <div className="project-meta" style={{ marginTop: '0.85rem' }}>
                        <span>Edited {formatDate(project.lastEditedAt)}</span>
                        <span className="pill-highlight" style={{ borderRadius: '999px', padding: '0.2rem 0.6rem', fontSize: '0.72rem' }}>Open →</span>
                      </div>
                    </button>
                    <button
                      title="Delete project"
                      onClick={(e) => { e.stopPropagation(); void handleDeleteProject(project.id) }}
                      aria-label={`Delete ${project.name}`}
                      style={{
                        position: 'absolute',
                        top: '0.75rem',
                        right: '0.75rem',
                        background: 'rgba(255, 50, 50, 0.15)',
                        border: '1px solid rgba(255, 50, 50, 0.3)',
                        borderRadius: '6px',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ff6b6b',
                        cursor: 'pointer',
                        zIndex: 10,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 50, 50, 0.25)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 50, 50, 0.15)' }}
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        {modalsJsx}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // WORKSPACE PAGE
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="app-shell" style={{ display: 'grid', gridTemplateRows: 'auto 1fr', minHeight: '100vh' }}>
      <Starfield />
      <div className="nebula nebula-tl" aria-hidden="true" />
      <div className="nebula nebula-cr" aria-hidden="true" />

      {/* Workspace top bar */}
      <header className="glass-panel" style={{
        position: 'relative',
        zIndex: 3,
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.65rem 1.25rem',
        borderRadius: 0,
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: '1px solid var(--glass-border)',
        flexWrap: 'wrap',
      }}>
        {/* Back */}
        <button
          id="back-to-home-btn"
          className="ghost-button"
          onClick={goHome}
          style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '999px' }}
          title="Back to projects"
        >
          ← Home
        </button>

        {/* Divider */}
        <span style={{ width: '1px', height: '1.2rem', background: 'var(--border-subtle)', flexShrink: 0 }} />

        {/* Logo */}
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)', lineHeight: 1 }}>Aether</span>

        {/* Project name */}
        {activeProject && (
          <>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600 }}>{activeProject.name}</span>
            <span className="pill" style={{ fontSize: '0.72rem' }}>{typeLabels[activeProject.type]}</span>
          </>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Save chip + actions */}
        <span className="status-chip" style={{ fontSize: '0.75rem' }}>{saveMessage}</span>
        {activeProject && activeProject.type !== 'notes' && (
          <button id="export-btn" className="ghost-button" onClick={() => setShowExport(true)} style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem', borderRadius: '999px' }}>Export</button>
        )}
        {activeProject?.type === 'notes' && (
          <button className="ghost-button" onClick={() => void createPage(null)} style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem', borderRadius: '999px' }}>+ Page</button>
        )}
      </header>

      {/* Workspace body */}
      <main style={{ position: 'relative', zIndex: 2, padding: '1rem', overflow: 'auto', minHeight: 0 }}>
        {workspaceJsx ?? (
          <div className="empty-state">No project selected.</div>
        )}
      </main>

      {modalsJsx}
    </div>
  )
}

export default App
