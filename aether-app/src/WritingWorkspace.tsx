import { useState, type CSSProperties, type MutableRefObject } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import WritingBlockCard from './WritingBlockCard'
import {
  type PageBlock,
  type PageComment,
  type PageSummary,
  type PageVersion,
  type ProjectSummary,
  type BlockType,
  createEmptyBlock,
  typeLabels,
} from './models'

type WritingWorkspaceProps = {
  activeProject: ProjectSummary
  pages: Array<PageSummary & { depth: number }>
  activePageId: number | null
  pageTitle: string
  draftBlocks: PageBlock[]
  comments: PageComment[]
  versions: PageVersion[]
  selectedBlockKey: string | null
  selectedBlockComments: PageComment[]
  selectedBlockType: string
  newCommentText: string
  saveMessage: string
  isWorkspaceLoading: boolean
  headingEntries: Array<{ blockKey: string; title: string; level: number }>
  blockRefs: MutableRefObject<Record<string, HTMLDivElement | null>>
  canAddCharacter: boolean
  canAddLoreSection: boolean
  canAddArc: boolean
  canAddChapter: boolean
  onSelectPage: (pageId: number) => void
  onMovePage: (targetPageId: number) => void
  onStartDragPage: (pageId: number) => void
  onTitleChange: (value: string) => void
  onSelectBlock: (blockKey: string) => void
  onMoveBlock: (blockKey: string, direction: -1 | 1) => void
  onDeleteBlock: (blockKey: string) => void
  onUpdateBlocks: (updater: (blocks: PageBlock[]) => PageBlock[]) => void
  onSnapshot: () => void
  onCommentTextChange: (value: string) => void
  onAddComment: () => void
  onRestoreVersion: (versionId: number) => void
  onAddCharacter: () => void
  onAddLoreSection: () => void
  onAddArc: () => void
  onAddChapter: () => void
  focusMode: boolean
  onToggleFocusMode: () => void
  onDeletePage?: (pageId: number) => void
}

function WritingWorkspace({
  activeProject,
  pages,
  activePageId,
  pageTitle,
  draftBlocks,
  comments,
  versions,
  selectedBlockKey,
  selectedBlockComments,
  selectedBlockType,
  newCommentText,
  saveMessage,
  isWorkspaceLoading,
  headingEntries,
  blockRefs,
  canAddCharacter,
  canAddLoreSection,
  canAddArc,
  canAddChapter,
  onSelectPage,
  onMovePage,
  onStartDragPage,
  onTitleChange,
  onSelectBlock,
  onMoveBlock,
  onDeleteBlock,
  onUpdateBlocks,
  onSnapshot,
  onCommentTextChange,
  onAddComment,
  onRestoreVersion,
  onAddCharacter,
  onAddLoreSection,
  onAddArc,
  onAddChapter,
  focusMode,
  onToggleFocusMode,
  onDeletePage,
}: WritingWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'pages'>('pages')
  const insertTypeForPage: BlockType =
    canAddCharacter
      ? 'character-card'
      : canAddLoreSection
        ? 'lore-section'
        : canAddChapter
          ? 'chapter-link-card'
          : 'story-section'

  return (
    <div className={`workspace-shell${focusMode ? ' focus-mode' : ''}`}>
      <aside className="left-rail notes-rail">
        <div className="rail-section">
          <div className="rail-header" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Pages</span>
            <span className="pill">{pages.length} pages</span>
          </div>

          <div className="page-tree">
            {pages.map((page) => (
              <div
                key={page.id}
                className={`page-tree-row ${page.id === activePageId ? 'page-tree-row-active' : ''}`}
                style={{ '--depth': page.depth } as CSSProperties}
                draggable
                onDragStart={() => onStartDragPage(page.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => onMovePage(page.id)}
              >
                <button className="page-tree-button" onClick={() => onSelectPage(page.id)}>
                  {page.title}
                </button>
                {onDeletePage && (
                  <button
                    className="page-tree-delete"
                    title="Delete page"
                    onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete "${page.title}"? This cannot be undone.`)) onDeletePage(page.id) }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {activeTab === 'pages' && (
          <div className="rail-section compact">
            <p className="rail-label">Section Outline</p>
            {headingEntries.length > 0 ? (
              headingEntries.map((heading) => (
                <button
                  key={heading.blockKey}
                  className={`toc-item toc-level-${heading.level}`}
                  onClick={() =>
                    blockRefs.current[heading.blockKey]?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    })
                  }
                >
                  {heading.title}
                </button>
              ))
            ) : (
              <span className="rail-chip">This page uses custom sections instead of H1-H3 headings.</span>
            )}
          </div>
        )}
      </aside>

      <section className="editor-panel notes-editor">
        <>
          <div className="editor-header">
            <div>
              <p className="panel-kicker">Writing Workspace</p>
              <h3>{pageTitle || 'Untitled Page'}</h3>
            </div>

            <div className="editor-status">
              <span className="status-chip">{saveMessage}</span>
              <span className="status-copy">{typeLabels[activeProject.type]}</span>
            </div>
          </div>

            {isWorkspaceLoading ? (
              <div className="empty-state">Opening story page...</div>
            ) : (
              <>
                <div className="editor-controls">
                  <input className="page-title-input" value={pageTitle} onChange={(event) => onTitleChange(event.target.value)} />

                  <div className="toolbar-row">
                    <button className="ghost-button small-button" onClick={onSnapshot}>
                      Snapshot now
                    </button>
                    <button
                      className="ghost-button small-button"
                      onClick={onToggleFocusMode}
                      title={focusMode ? 'Exit focus mode (F11)' : 'Focus mode (F11)'}
                    >
                      {focusMode ? 'Exit Focus' : 'Focus'}
                    </button>
                    {canAddCharacter ? (
                      <button className="ghost-button small-button" onClick={onAddCharacter}>
                        Add character
                      </button>
                    ) : null}
                    {canAddLoreSection ? (
                      <button className="ghost-button small-button" onClick={onAddLoreSection}>
                        Add lore section
                      </button>
                    ) : null}
                    {canAddArc ? (
                      <button className="ghost-button small-button" onClick={onAddArc}>
                        Add arc
                      </button>
                    ) : null}
                    {canAddChapter ? (
                      <button className="ghost-button small-button" onClick={onAddChapter}>
                        Add chapter
                      </button>
                    ) : null}
                  </div>
                </div>

                <article className="editor-surface notes-surface">
                  <div className="editor-eyebrow">
                    <span>{typeLabels[activeProject.type]}</span>
                    <span>{draftBlocks.length} sections</span>
                    <span>{comments.length} comments</span>
                    <span>Quick insert: {insertTypeForPage}</span>
                  </div>

              <div className="block-list">
                {draftBlocks.length === 0 ? (
                  <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                    <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>This page is empty.</p>
                    <button
                      className="ghost-button"
                      onClick={() => {
                        onUpdateBlocks((blocks) => [...blocks, createEmptyBlock(insertTypeForPage)])
                      }}
                    >
                      + Add first block
                    </button>
                  </div>
                ) : (
                  draftBlocks.map((block, index) => (
                    <WritingBlockCard
                      key={block.blockKey}
                      block={block}
                      index={index}
                      selected={selectedBlockKey === block.blockKey}
                      onSelect={onSelectBlock}
                      onInsertAfter={() => {
                        const nextType: BlockType =
                          canAddCharacter
                            ? 'character-card'
                            : canAddLoreSection
                              ? 'lore-section'
                              : canAddChapter
                                ? 'chapter-link-card'
                                : 'story-section'

                        onUpdateBlocks((blocks) => {
                          const nextBlocks = [...blocks]
                          nextBlocks.splice(index + 1, 0, createEmptyBlock(nextType))
                          return nextBlocks
                        })
                      }}
                      onMove={onMoveBlock}
                      onDelete={onDeleteBlock}
                      onUpdateBlocks={onUpdateBlocks}
                      setBlockRef={(blockKey, node) => {
                        blockRefs.current[blockKey] = node
                      }}
                    />
                  ))
                )}
              </div>
                </article>
              </>
            )}
        </>
      </section>

      <aside className="right-panel notes-panel">
        <div className="panel-section">
          <div className="panel-heading tight">
            <div>
              <p className="panel-kicker">Comments</p>
              <h3>{selectedBlockType}</h3>
            </div>
          </div>
          <p className="context-copy">
            Feedback stays attached to the selected section so we can review overview notes,
            character cards, lore, and chapters in context.
          </p>
          <textarea
            className="comment-input"
            rows={4}
            value={newCommentText}
            placeholder="Leave a note for this section..."
            onChange={(event) => onCommentTextChange(event.target.value)}
          />
          <button className="primary-button wide-button" onClick={onAddComment}>
            Add Comment
          </button>
          <div className="comment-list">
            {selectedBlockComments.length > 0 ? (
              selectedBlockComments.map((comment) => (
                <article key={comment.id} className="context-card">
                  <span className="context-label">{new Date(comment.createdAt).toLocaleTimeString()}</span>
                  <p>{comment.body}</p>
                </article>
              ))
            ) : (
              <div className="empty-state compact-empty">No comments on this section yet.</div>
            )}
          </div>
        </div>

        <div className="panel-section">
          <div className="panel-heading tight">
            <div>
              <p className="panel-kicker">Version History</p>
              <h3>Restore points</h3>
            </div>
          </div>
          <div className="version-list">
            {versions.length > 0 ? (
              versions.map((version) => (
                <article key={version.id} className="context-card version-card">
                  <div className="version-meta">
                    <span className="context-label">{new Date(version.createdAt).toLocaleDateString()}</span>
                    <span className="context-label">{new Date(version.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <button className="mini-button" onClick={() => onRestoreVersion(version.id)}>
                    Restore
                  </button>
                </article>
              ))
            ) : (
              <div className="empty-state compact-empty">Versions appear after the first autosave.</div>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}

export default WritingWorkspace
