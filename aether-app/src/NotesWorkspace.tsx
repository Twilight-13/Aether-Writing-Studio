import type { CSSProperties, MutableRefObject } from 'react'
import BlockCard from './BlockCard'
import {
  blockTypeLabels,
  blockTypeOptions,
  type BlockType,
  type PageBlock,
  type PageComment,
  type PageSummary,
  type PageVersion,
  type ProjectSummary,
  type ProjectType,
  typeLabels,
} from './models'

const notesBlockTypeOptions = blockTypeOptions.filter(
  (option) =>
    ![
      'overview-title',
      'story-section',
      'genre-tone',
      'lead-characters',
      'key-highlights',
      'character-card',
      'lore-section',
      'outline-header',
      'humanizer-rules',
      'arc-card',
      'chapter-link-card',
      'chapter-identity',
      'chapter-type',
      'chapter-body',
      'key-points',
      'chapter-length',
    ].includes(option),
)

type NotesWorkspaceProps = {
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
  newBlockType: BlockType
  newCommentText: string
  saveMessage: string
  isWorkspaceLoading: boolean
  headingEntries: Array<{ blockKey: string; title: string; level: number }>
  blockRefs: MutableRefObject<Record<string, HTMLDivElement | null>>
  onSelectPage: (pageId: number) => void
  onCreatePage: (parentId: number | null) => void
  onMovePage: (targetPageId: number) => void
  onStartDragPage: (pageId: number) => void
  onTitleChange: (value: string) => void
  onNewBlockTypeChange: (type: BlockType) => void
  onInsertBlock: (type: BlockType, afterIndex?: number) => void
  onSelectBlock: (blockKey: string) => void
  onMoveBlock: (blockKey: string, direction: -1 | 1) => void
  onDeleteBlock: (blockKey: string) => void
  onUpdateBlock: (blockKey: string, updater: (block: PageBlock) => PageBlock) => void
  onSnapshot: () => void
  onCommentTextChange: (value: string) => void
  onAddComment: () => void
  onRestoreVersion: (versionId: number) => void
  focusMode: boolean
  onToggleFocusMode: () => void
}

function NotesWorkspace({
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
  newBlockType,
  newCommentText,
  saveMessage,
  isWorkspaceLoading,
  headingEntries,
  blockRefs,
  onSelectPage,
  onCreatePage,
  onMovePage,
  onStartDragPage,
  onTitleChange,
  onNewBlockTypeChange,
  onInsertBlock,
  onSelectBlock,
  onMoveBlock,
  onDeleteBlock,
  onUpdateBlock,
  onSnapshot,
  onCommentTextChange,
  onAddComment,
  onRestoreVersion,
  focusMode,
  onToggleFocusMode,
}: NotesWorkspaceProps) {
  return (
    <div className={`workspace-shell${focusMode ? ' focus-mode' : ''}`}>
      <aside className="left-rail notes-rail">
        <div className="rail-section">
          <div className="rail-header">
            <p className="rail-label">Pages</p>
            <button className="mini-button" onClick={() => onCreatePage(null)}>
              Add page
            </button>
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
                <button className="page-tree-add" title="Add sub-page" onClick={() => onCreatePage(page.id)}>
                  +
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rail-section compact">
          <p className="rail-label">Table of contents</p>
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
            <span className="rail-chip">Add headings to generate a TOC</span>
          )}
        </div>
      </aside>

      <section className="editor-panel notes-editor">
        <div className="editor-header">
          <div>
            <p className="panel-kicker">Main Editor</p>
            <h3>{pageTitle || 'Untitled Page'}</h3>
          </div>

          <div className="editor-status">
            <span className="status-chip">{saveMessage}</span>
            <span className="status-copy">{typeLabels[activeProject.type as ProjectType]}</span>
          </div>
        </div>

        {isWorkspaceLoading ? (
          <div className="empty-state">Opening page...</div>
        ) : (
          <>
            <div className="editor-controls">
              <input className="page-title-input" value={pageTitle} onChange={(event) => onTitleChange(event.target.value)} />

              <div className="toolbar-row">
                <select value={newBlockType} onChange={(event) => onNewBlockTypeChange(event.target.value as BlockType)}>
                  {notesBlockTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {blockTypeLabels[option]}
                    </option>
                  ))}
                </select>
                <button className="ghost-button small-button" onClick={() => onInsertBlock(newBlockType)}>
                  Add block
                </button>
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
              </div>
            </div>

            <article className="editor-surface notes-surface">
              <div className="editor-eyebrow">
                <span>{typeLabels[activeProject.type]}</span>
                <span>{draftBlocks.length} blocks</span>
                <span>{comments.length} comments</span>
              </div>

              <div className="block-list">
                {draftBlocks.map((block, index) => (
                  <BlockCard
                    key={block.blockKey}
                    block={block}
                    index={index}
                    selected={selectedBlockKey === block.blockKey}
                    onSelect={onSelectBlock}
                    onInsertAfter={(insertIndex) => onInsertBlock(newBlockType, insertIndex)}
                    onMove={onMoveBlock}
                    onDelete={onDeleteBlock}
                    onUpdate={onUpdateBlock}
                    setBlockRef={(blockKey, node) => {
                      blockRefs.current[blockKey] = node
                    }}
                  />
                ))}
              </div>
            </article>
          </>
        )}
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
            Notes attach to the selected block so you can keep review feedback anchored while the page evolves.
          </p>
          <textarea
            className="comment-input"
            rows={4}
            value={newCommentText}
            placeholder="Leave a note for this block..."
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
              <div className="empty-state compact-empty">No comments on this block yet.</div>
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

export default NotesWorkspace
