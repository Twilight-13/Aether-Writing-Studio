import { blockTypeLabels, blockTypeOptions, clone, convertBlockType, type BlockType, type PageBlock } from './models'

type BlockCardProps = {
  block: PageBlock
  index: number
  selected: boolean
  onSelect: (blockKey: string) => void
  onInsertAfter: (index: number) => void
  onMove: (blockKey: string, direction: -1 | 1) => void
  onDelete: (blockKey: string) => void
  onUpdate: (blockKey: string, updater: (block: PageBlock) => PageBlock) => void
  setBlockRef: (blockKey: string, node: HTMLDivElement | null) => void
}

function BlockCard({
  block,
  index,
  selected,
  onSelect,
  onInsertAfter,
  onMove,
  onDelete,
  onUpdate,
  setBlockRef,
}: BlockCardProps) {
  const setField = (field: string, value: unknown) =>
    onUpdate(block.blockKey, (current) => ({
      ...current,
      data: { ...current.data, [field]: value },
    }))

  return (
    <div
      ref={(node) => setBlockRef(block.blockKey, node)}
      className={`block-card ${selected ? 'block-selected' : ''}`}
    >
      <div className="block-toolbar">
        <div className="block-meta">
          <span className="block-badge">{blockTypeLabels[block.type]}</span>
          <select
            value={block.type}
            onChange={(event) =>
              onUpdate(block.blockKey, (current) =>
                convertBlockType(current, event.target.value as BlockType),
              )
            }
          >
            {blockTypeOptions.map((option) => (
              <option key={option} value={option}>
                {blockTypeLabels[option]}
              </option>
            ))}
          </select>
        </div>

        <div className="block-actions">
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
      </div>

      {block.type === 'paragraph' && (
        <textarea
          className="block-textarea prose-text"
          rows={4}
          value={String(block.data.text ?? '')}
          onChange={(event) => setField('text', event.target.value)}
        />
      )}

      {block.type === 'heading1' && (
        <input
          className="block-input heading-input heading-one"
          value={String(block.data.text ?? '')}
          onChange={(event) => setField('text', event.target.value)}
        />
      )}

      {block.type === 'heading2' && (
        <input
          className="block-input heading-input heading-two"
          value={String(block.data.text ?? '')}
          onChange={(event) => setField('text', event.target.value)}
        />
      )}

      {block.type === 'heading3' && (
        <input
          className="block-input heading-input heading-three"
          value={String(block.data.text ?? '')}
          onChange={(event) => setField('text', event.target.value)}
        />
      )}

      {block.type === 'quote' && (
        <div className="block-stack">
          <textarea
            className="block-textarea quote-text"
            rows={4}
            value={String(block.data.text ?? '')}
            onChange={(event) => setField('text', event.target.value)}
          />
          <input
            className="block-input"
            value={String(block.data.source ?? '')}
            placeholder="Source"
            onChange={(event) => setField('source', event.target.value)}
          />
        </div>
      )}

      {block.type === 'callout' && (
        <div className="block-stack">
          <select
            value={String(block.data.tone ?? 'starlight')}
            onChange={(event) => setField('tone', event.target.value)}
          >
            <option value="starlight">Starlight</option>
            <option value="warning">Warning</option>
            <option value="teal">Teal</option>
          </select>
          <textarea
            className="block-textarea"
            rows={4}
            value={String(block.data.text ?? '')}
            onChange={(event) => setField('text', event.target.value)}
          />
        </div>
      )}

      {block.type === 'toggle' && (
        <div className="block-stack">
          <input
            className="block-input"
            value={String(block.data.title ?? '')}
            onChange={(event) => setField('title', event.target.value)}
          />
          <textarea
            className="block-textarea"
            rows={4}
            value={String(block.data.content ?? '')}
            onChange={(event) => setField('content', event.target.value)}
          />
        </div>
      )}

      {(block.type === 'ordered-list' || block.type === 'unordered-list') && (
        <textarea
          className="block-textarea"
          rows={3}
          value={String(block.data.text ?? '')}
          onChange={(event) => setField('text', event.target.value)}
        />
      )}

      {block.type === 'todo' && (
        <div className="todo-row">
          <label className="todo-check">
            <input
              type="checkbox"
              checked={Boolean(block.data.checked)}
              onChange={(event) => setField('checked', event.target.checked)}
            />
            <span>Done</span>
          </label>
          <textarea
            className="block-textarea"
            rows={3}
            value={String(block.data.text ?? '')}
            onChange={(event) => setField('text', event.target.value)}
          />
        </div>
      )}

      {block.type === 'table' && (
        <div className="block-stack">
          <div className="table-actions">
            <button
              className="mini-button"
              onClick={() =>
                onUpdate(block.blockKey, (current) => {
                  const rows = clone((current.data.rows as string[][]) ?? [['']])
                  const width = rows[0]?.length ?? 1
                  rows.push(Array.from({ length: width }, () => ''))
                  return { ...current, data: { ...current.data, rows } }
                })
              }
            >
              Add row
            </button>
            <button
              className="mini-button"
              onClick={() =>
                onUpdate(block.blockKey, (current) => {
                  const rows = clone((current.data.rows as string[][]) ?? [['']]).map((row) => [...row, ''])
                  return { ...current, data: { ...current.data, rows } }
                })
              }
            >
              Add column
            </button>
          </div>

          <div className="table-grid">
            {((block.data.rows as string[][]) ?? [['']]).map((row, rowIndex) => (
              <div key={`${block.blockKey}-${rowIndex}`} className="table-row">
                {row.map((cell, cellIndex) => (
                  <input
                    key={`${block.blockKey}-${rowIndex}-${cellIndex}`}
                    className="table-cell"
                    value={cell}
                    onChange={(event) =>
                      onUpdate(block.blockKey, (current) => {
                        const rows = clone((current.data.rows as string[][]) ?? [['']])
                        rows[rowIndex][cellIndex] = event.target.value
                        return { ...current, data: { ...current.data, rows } }
                      })
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {block.type === 'image' && (
        <div className="block-stack">
          <input
            className="block-input"
            value={String(block.data.src ?? '')}
            placeholder="Paste a local path or URL"
            onChange={(event) => setField('src', event.target.value)}
          />
          <input
            className="block-input"
            value={String(block.data.caption ?? '')}
            placeholder="Caption"
            onChange={(event) => setField('caption', event.target.value)}
          />
          {String(block.data.src ?? '').trim() ? (
            <div className="image-preview">
              <img src={String(block.data.src)} alt={String(block.data.caption ?? 'Reference image')} />
            </div>
          ) : null}
        </div>
      )}

      {block.type === 'link' && (
        <div className="block-stack">
          <input
            className="block-input"
            value={String(block.data.label ?? '')}
            placeholder="Link label"
            onChange={(event) => setField('label', event.target.value)}
          />
          <input
            className="block-input"
            value={String(block.data.url ?? '')}
            placeholder="https://"
            onChange={(event) => setField('url', event.target.value)}
          />
          <a className="link-preview" href={String(block.data.url ?? '#')} target="_blank" rel="noreferrer">
            {String(block.data.label ?? 'Open link')}
          </a>
        </div>
      )}

      {block.type === 'divider' && <hr className="divider-block" />}

      {block.type === 'code' && (
        <div className="block-stack">
          <input
            className="block-input"
            value={String(block.data.language ?? '')}
            placeholder="Language"
            onChange={(event) => setField('language', event.target.value)}
          />
          <textarea
            className="block-textarea code-text"
            rows={7}
            value={String(block.data.code ?? '')}
            onChange={(event) => setField('code', event.target.value)}
          />
        </div>
      )}
    </div>
  )
}

export default BlockCard
