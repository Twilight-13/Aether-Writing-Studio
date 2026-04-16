import {
  synchronizeChapterMetrics,
  type PageBlock,
} from './models'

type WritingBlockCardProps = {
  block: PageBlock
  index: number
  selected: boolean
  onSelect: (blockKey: string) => void
  onInsertAfter: (index: number) => void
  onMove: (blockKey: string, direction: -1 | 1) => void
  onDelete: (blockKey: string) => void
  onUpdateBlocks: (updater: (blocks: PageBlock[]) => PageBlock[]) => void
  setBlockRef: (blockKey: string, node: HTMLDivElement | null) => void
}

function toText(value: unknown): string {
  if (Array.isArray(value)) {
    // Arrays of objects → each object's values joined with newlines
    return value.map((item) =>
      typeof item === 'object' && item !== null
        ? Object.values(item as Record<string, unknown>).map(String).join(' — ')
        : String(item),
    ).join('\n')
  }
  return String(value ?? '')
}

/** Extract human-readable plain text from any block — no JSON. */
function copyBlockContent(block: PageBlock) {
  const d = block.data as Record<string, unknown>

  // Ordered priority: most specific → generic
  const parts: string[] = []

  // Named text fields in priority order — collect all that exist
  const scalarFields: (keyof typeof d)[] = [
    'title', 'storyTitle', 'name', 'tagline', 'label', 'emotion', 'value',
    'genres', 'quote', 'age',
  ]
  const longFields: (keyof typeof d)[] = [
    'text', 'body', 'summary', 'tone', 'rules', 'items', 'characters',
    'synopsis', 'overview', 'purpose', 'beginning', 'ending',
    'roleInStory', 'abilities', 'physicalDescription', 'psychologicalProfile',
    'relationships', 'customFields', 'arcNotes', 'members', 'groupDynamics', 'collectiveGoal',
  ]

  for (const key of scalarFields) {
    const v = d[key]
    if (v !== undefined && v !== null && String(v).trim()) {
      parts.push(String(v).trim())
    }
  }

  for (const key of longFields) {
    const v = d[key]
    if (v !== undefined && v !== null && toText(v).trim()) {
      parts.push(toText(v).trim())
    }
  }

  const text = parts.length > 0 ? parts.join('\n\n') : ''
  void navigator.clipboard.writeText(text)
}

function WritingBlockCard({
  block,
  index,
  selected,
  onSelect,
  onInsertAfter,
  onMove,
  onDelete,
  onUpdateBlocks,
  setBlockRef,
}: WritingBlockCardProps) {
  const updateFields = (patch: Record<string, unknown>) => {
    onUpdateBlocks((blocks) =>
      synchronizeChapterMetrics(
        blocks.map((entry) =>
          entry.blockKey === block.blockKey
            ? { ...entry, data: { ...entry.data, ...patch } }
            : entry,
        ),
      ),
    )
  }

  const renderActions = () => (
    <div className="block-actions">
      <button className="mini-button" onClick={() => copyBlockContent(block)}>
        Copy
      </button>
      <button className="mini-button" onClick={() => onMove(block.blockKey, -1)}>
        Up
      </button>
      <button className="mini-button" onClick={() => onMove(block.blockKey, 1)}>
        Down
      </button>
      <button className="mini-button" onClick={() => onSelect(block.blockKey)}>
        Comment
      </button>
      <button className="mini-button" onClick={() => onInsertAfter(index)}>
        Insert after
      </button>
      <button className="mini-button danger" onClick={() => onDelete(block.blockKey)}>
        Delete
      </button>
    </div>
  )

  const renderLabeledTextarea = (
    label: string,
    field: string,
    value: unknown,
    rows = 4,
    placeholder = '',
  ) => (
    <label className="field">
      <span>{label}</span>
      <textarea
        className="block-textarea"
        rows={rows}
        value={toText(value)}
        placeholder={placeholder}
        onChange={(event) => updateFields({ [field]: event.target.value })}
      />
    </label>
  )

  const renderLabeledInput = (label: string, field: string, value: unknown, placeholder = '') => (
    <label className="field">
      <span>{label}</span>
      <input
        className="block-input"
        value={toText(value)}
        placeholder={placeholder}
        onChange={(event) => updateFields({ [field]: event.target.value })}
      />
    </label>
  )

  return (
    <div
      ref={(node) => setBlockRef(block.blockKey, node)}
      className={`block-card ${selected ? 'block-selected' : ''}`}
    >
      <div className="block-toolbar">
        <div className="block-meta">
          <span className="block-badge">{block.type}</span>
        </div>
        {renderActions()}
      </div>

      {block.type === 'overview-title' && (
        <div className="block-stack">
          {renderLabeledInput('Story Title', 'title', block.data.title, 'Untitled Story')}
          {renderLabeledTextarea('Core Summary', 'summary', block.data.summary, 4)}
        </div>
      )}

      {block.type === 'story-section' && (
        <div className="block-stack">
          {renderLabeledInput('Label', 'label', block.data.label, 'Section label')}
          {renderLabeledInput('Section Title', 'title', block.data.title, 'Section title')}
          {renderLabeledTextarea('Body', 'body', block.data.body, 5)}
        </div>
      )}

      {block.type === 'genre-tone' && (
        <div className="block-stack">
          {renderLabeledInput('Genres', 'genres', block.data.genres, 'dark fantasy, sci-fi thriller')}
          {renderLabeledTextarea('Tone', 'tone', block.data.tone, 3)}
        </div>
      )}

      {block.type === 'lead-characters' && renderLabeledTextarea('Lead Characters', 'characters', block.data.characters, 5)}

      {block.type === 'key-highlights' && renderLabeledTextarea('Key Characteristics', 'items', block.data.items, 5)}

      {block.type === 'character-card' && (
        <div className="block-stack">
          <div className="two-column-grid">
            {renderLabeledInput('Name', 'name', block.data.name)}
            <label className="field">
              <span>Type</span>
              <select
                value={toText(block.data.roleType)}
                onChange={(event) => updateFields({ roleType: event.target.value })}
              >
                <option value="Protagonist">Protagonist</option>
                <option value="Antagonist">Antagonist</option>
                <option value="Supporting">Supporting</option>
                <option value="Minor">Minor</option>
                <option value="Group">Group</option>
              </select>
            </label>
          </div>
          <div className="two-column-grid">
            {renderLabeledInput('Age', 'age', block.data.age)}
            {renderLabeledInput('Defining Quote', 'quote', block.data.quote)}
          </div>
          {renderLabeledTextarea('Role in the Story', 'roleInStory', block.data.roleInStory, 3)}
          {renderLabeledTextarea('Powers / Abilities / Skills', 'abilities', block.data.abilities, 3)}
          {renderLabeledTextarea('Physical Description', 'physicalDescription', block.data.physicalDescription, 3)}
          {renderLabeledTextarea('Psychological Profile', 'psychologicalProfile', block.data.psychologicalProfile, 4)}
          {renderLabeledTextarea('Relationships', 'relationships', block.data.relationships, 3)}
          {renderLabeledTextarea('Custom Fields', 'customFields', block.data.customFields, 3)}
          {renderLabeledTextarea('Arc Notes', 'arcNotes', block.data.arcNotes, 3)}
          {toText(block.data.roleType) === 'Group' ? (
            <>
              {renderLabeledTextarea('Member List', 'members', block.data.members, 4)}
              {renderLabeledTextarea('Group Dynamics', 'groupDynamics', block.data.groupDynamics, 3)}
              {renderLabeledTextarea('Collective Goal', 'collectiveGoal', block.data.collectiveGoal, 3)}
            </>
          ) : null}
        </div>
      )}

      {block.type === 'lore-section' && (
        <div className="block-stack">
          <div className="two-column-grid">
            {renderLabeledInput('Section Title', 'title', block.data.title)}
            <label className="field">
              <span>Expanded</span>
              <label className="todo-check">
                <input
                  type="checkbox"
                  checked={block.data.open === true}
                  onChange={(event) => updateFields({ open: event.target.checked })}
                />
                <span>{block.data.open ? 'Open' : 'Closed'}</span>
              </label>
            </label>
          </div>
          {renderLabeledTextarea('Content', 'body', block.data.body, 5)}
        </div>
      )}

      {block.type === 'outline-header' && (
        <div className="block-stack">
          {renderLabeledInput('Story Title', 'storyTitle', block.data.storyTitle)}
          {renderLabeledInput('Tagline', 'tagline', block.data.tagline)}
          {renderLabeledTextarea('Story Beginning', 'beginning', block.data.beginning, 3)}
          {renderLabeledTextarea('Story Ending', 'ending', block.data.ending, 3)}
        </div>
      )}

      {block.type === 'humanizer-rules' && renderLabeledTextarea('Rules', 'rules', block.data.rules, 8)}

      {block.type === 'arc-card' && (
        <div className="block-stack">
          <div className="two-column-grid">
            <label className="field">
              <span>Arc Number</span>
              <input
                className="block-input"
                type="number"
                value={Number(block.data.arcNumber ?? 1)}
                onChange={(event) => updateFields({ arcNumber: Number(event.target.value) || 1 })}
              />
            </label>
            {renderLabeledInput('Arc Title', 'title', block.data.title)}
          </div>
          {renderLabeledTextarea('Arc Overview', 'overview', block.data.overview, 4)}
          {renderLabeledTextarea('What This Arc Establishes', 'purpose', block.data.purpose, 3)}
          {renderLabeledInput('Emotional Register', 'emotion', block.data.emotion)}
          <label className="field">
            <span>Chapter List</span>
            <textarea
              className="block-textarea"
              rows={5}
              value={Array.isArray(block.data.chapters) ? block.data.chapters.map((chapter) => `${toText((chapter as Record<string, unknown>).title)} - ${toText((chapter as Record<string, unknown>).synopsis)}`).join('\n') : ''}
              readOnly
            />
          </label>
        </div>
      )}

      {block.type === 'chapter-link-card' && (
        <div className="block-stack">
          {renderLabeledInput('Chapter Title', 'title', block.data.title)}
          {renderLabeledTextarea('One-line Synopsis', 'synopsis', block.data.synopsis, 3)}
        </div>
      )}

      {block.type === 'chapter-identity' && (
        <div className="two-column-grid">
          <label className="field">
            <span>Chapter Number</span>
            <input
              className="block-input"
              type="number"
              value={Number(block.data.chapterNumber ?? 1)}
              onChange={(event) => updateFields({ chapterNumber: Number(event.target.value) || 1 })}
            />
          </label>
          {renderLabeledInput('Chapter Title', 'title', block.data.title)}
        </div>
      )}

      {block.type === 'chapter-type' && renderLabeledInput('Chapter Type', 'value', block.data.value)}

      {block.type === 'chapter-body' && renderLabeledTextarea('Chapter Body', 'text', block.data.text, 12)}

      {block.type === 'key-points' && renderLabeledTextarea('Key Points', 'items', block.data.items, 6)}

      {block.type === 'chapter-length' && (
        <div className="context-card">
          <span className="context-label">Word Count</span>
          <p>{toText(block.data.text)}</p>
        </div>
      )}
    </div>
  )
}

export default WritingBlockCard
