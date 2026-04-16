import { useEffect, useState } from 'react'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx'
import type { PageBlock, PageSummary, ProjectSummary } from './models'

type ExportFormat = 'docx' | 'pdf'
type ExportScope = 'full' | 'arc' | 'chapter'

type Props = {
  project: ProjectSummary
  pages: (PageSummary & { depth: number })[]
  getPageBlocks: (pageId: number) => Promise<PageBlock[]>
  onClose: () => void
}

function getBodyText(blocks: PageBlock[]): string {
  const d = blocks.find((b) => b.type === 'chapter-body')?.data
  if (!d) return ''
  return typeof d.text === 'string' ? d.text : ''
}

function getChapterHeading(blocks: PageBlock[], fallbackTitle: string): string {
  const id = blocks.find((b) => b.type === 'chapter-identity')?.data
  const num = id?.chapterNumber ? `Chapter ${String(id.chapterNumber)}` : ''
  const title = typeof id?.title === 'string' && id.title ? id.title : fallbackTitle
  return num ? `${num} — ${title}` : title
}

// ── Arc helpers ──────────────────────────────────────────────────────────────

/** Pages at depth 1 (direct children of root) that look like arcs */
function isArcPage(page: PageSummary & { depth: number }) {
  return page.depth === 1 && page.title.toLowerCase().startsWith('arc')
}

/** Pages at depth 2 (direct children of arc pages) are chapters */
function isChapterPage(page: PageSummary & { depth: number }) {
  return page.depth >= 2
}

// ── Export builders ────────────────────────────────────────────────────────

async function buildDocx(
  projectName: string,
  authorName: string,
  chapterPages: (PageSummary & { depth: number })[],
  getBlocks: (id: number) => Promise<PageBlock[]>,
): Promise<Blob> {
  const children: Paragraph[] = []

  // Title page
  children.push(
    new Paragraph({ text: '', spacing: { before: 2880 } }),
    new Paragraph({
      children: [new TextRun({ text: projectName, size: 72, font: 'Garamond', bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
    }),
  )
  if (authorName.trim()) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: authorName, size: 28, font: 'Garamond', color: '444444' })],
        alignment: AlignmentType.CENTER,
      }),
    )
  }

  // Chapters
  for (const page of chapterPages) {
    const blocks = await getBlocks(page.id)
    const heading = getChapterHeading(blocks, page.title)
    const body = getBodyText(blocks)

    children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(
      new Paragraph({
        text: heading,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 720, after: 720 },
      }),
    )

    for (const para of body.split('\n\n').filter(Boolean)) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: para.trim(), size: 24, font: 'Garamond' })],
          spacing: { after: 240 },
          indent: { firstLine: 720 },
        }),
      )
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  })

  const blob = await Packer.toBlob(doc)
  return blob
}

async function printAsPDF(
  projectName: string,
  authorName: string,
  chapterPages: (PageSummary & { depth: number })[],
  getBlocks: (id: number) => Promise<PageBlock[]>,
): Promise<void> {
  const items: { heading: string; body: string }[] = []

  for (const page of chapterPages) {
    const blocks = await getBlocks(page.id)
    items.push({ heading: getChapterHeading(blocks, page.title), body: getBodyText(blocks) })
  }

  const html = `<!DOCTYPE html><html><head>
  <title>${projectName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'IM Fell English', Georgia, serif; font-size: 12pt; line-height: 1.75; color: #111; padding: 2.5cm; max-width: 18cm; margin: auto; }
    h1.title { font-size: 28pt; text-align: center; margin: 6rem 0 0.5rem; }
    p.author { font-size: 14pt; text-align: center; color: #555; margin-bottom: 2rem; }
    h2 { font-size: 15pt; text-align: center; margin: 3rem 0 1.5rem; page-break-before: always; }
    p { text-indent: 1.5em; margin-bottom: 0.5em; }
    @page { margin: 2.5cm; @bottom-center { content: counter(page); } }
  </style></head><body>
  <h1 class="title">${projectName}</h1>
  ${authorName ? `<p class="author">${authorName}</p>` : ''}
  ${items.map((c) => `<h2>${c.heading}</h2>${c.body.split('\n\n').filter(Boolean).map((p) => `<p>${p.trim()}</p>`).join('\n')}`).join('\n')}
  </body></html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { alert('Allow popups to export PDF.'); return }
  win.document.write(html)
  win.document.close()
  win.onload = () => { win.focus(); win.print() }
}

// ── Component ─────────────────────────────────────────────────────────────

export default function ExportModal({ project, pages, getPageBlocks, onClose }: Props) {
  const [scope, setScope] = useState<ExportScope>('full')
  const [format, setFormat] = useState<ExportFormat>('docx')
  const [authorName, setAuthorName] = useState('')
  const [selectedArcId, setSelectedArcId] = useState<number | null>(null)
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const arcPages = pages.filter(isArcPage)
  const allChapterPages = pages.filter(isChapterPage)
  const chapterPagesForArc = selectedArcId
    ? allChapterPages.filter((p) => {
        const arc = pages.find((a) => a.id === selectedArcId)
        return arc ? p.depth === arc.depth + 1 && pages.some((a) => a.id === selectedArcId && p.depth >= 1) : false
      })
    : allChapterPages

  // Set initial selections
  useEffect(() => {
    if (arcPages.length > 0 && !selectedArcId) setSelectedArcId(arcPages[0].id)
  }, [arcPages.length])

  useEffect(() => {
    if (chapterPagesForArc.length > 0 && !selectedChapterId) setSelectedChapterId(chapterPagesForArc[0].id)
  }, [chapterPagesForArc.length])

  function targetPages(): (PageSummary & { depth: number })[] {
    if (scope === 'full') return allChapterPages
    if (scope === 'arc') {
      if (!selectedArcId) return allChapterPages
      // children of selected arc
      const arc = pages.find((p) => p.id === selectedArcId)
      if (!arc) return []
      return pages.filter((p) => p.depth === arc.depth + 1 && p.parentId === arc.id) as (PageSummary & { depth: number })[]
    }
    // single chapter
    const ch = pages.find((p) => p.id === selectedChapterId)
    return ch ? [ch as (PageSummary & { depth: number })] : []
  }

  async function handleExport() {
    if (exporting) return
    const targets = targetPages()
    if (targets.length === 0) { setError('No chapters found for this selection.'); return }
    setExporting(true)
    setError('')
    try {
      if (format === 'docx') {
        const blob = await buildDocx(project.name, authorName, targets, getPageBlocks)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${project.name.replace(/\s+/g, '_')}.docx`
        a.click()
        URL.revokeObjectURL(url)
        onClose()
      } else {
        await printAsPDF(project.name, authorName, targets, getPageBlocks)
        // keep modal open so user can print
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed. Check console for details.')
    } finally {
      setExporting(false)
    }
  }

  const targets = targetPages()

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="composer-modal glass-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Export project"
        style={{ maxWidth: '32rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="panel-kicker">Export</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginTop: '0.2rem' }}>
            Export Project
          </h2>
        </div>

        {/* Scope */}
        <div>
          <p className="export-section-header">Scope</p>
          <div style={{ display: 'grid', gap: '0.4rem' }}>
            {([
              ['full', `Entire Story (${allChapterPages.length} chapters)`],
              ['arc', 'Specific Arc'],
              ['chapter', 'Single Chapter'],
            ] as [ExportScope, string][]).map(([s, label]) => (
              <label key={s} className={`export-option${scope === s ? ' selected' : ''}`} onClick={() => setScope(s)} style={{ cursor: 'pointer' }}>
                <input type="radio" name="scope" value={s} checked={scope === s} onChange={() => setScope(s)} style={{ display: 'none' }} />
                <span style={{ color: scope === s ? 'var(--nebula-blue)' : 'var(--text-muted)', marginRight: '0.5rem' }}>●</span>
                {label}
              </label>
            ))}
          </div>

          {/* Arc selector */}
          {scope === 'arc' && arcPages.length > 0 && (
            <select
              value={selectedArcId ?? ''}
              onChange={(e) => setSelectedArcId(Number(e.target.value))}
              style={{ marginTop: '0.6rem', width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.6rem', border: '1px solid var(--border-subtle)', background: 'rgba(5,0,26,0.7)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
            >
              {arcPages.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          )}

          {/* Chapter selector */}
          {scope === 'chapter' && (
            <select
              value={selectedChapterId ?? ''}
              onChange={(e) => setSelectedChapterId(Number(e.target.value))}
              style={{ marginTop: '0.6rem', width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.6rem', border: '1px solid var(--border-subtle)', background: 'rgba(5,0,26,0.7)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
            >
              {allChapterPages.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          )}
        </div>

        {/* Format */}
        <div>
          <p className="export-section-header">Format</p>
          <div style={{ display: 'grid', gap: '0.4rem' }}>
            {([
              ['docx', 'Microsoft Word (.docx)'],
              ['pdf', 'PDF (opens print dialog)'],
            ] as [ExportFormat, string][]).map(([f, label]) => (
              <label key={f} className={`export-option${format === f ? ' selected' : ''}`} onClick={() => setFormat(f)} style={{ cursor: 'pointer' }}>
                <input type="radio" name="format" value={f} checked={format === f} onChange={() => setFormat(f)} style={{ display: 'none' }} />
                <span style={{ color: format === f ? 'var(--nebula-blue)' : 'var(--text-muted)', marginRight: '0.5rem' }}>●</span>
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Author */}
        <div className="field">
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Author name (optional)</span>
          <input
            id="export-author-input"
            className="block-input"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Your name"
            style={{ marginTop: '0.3rem' }}
          />
        </div>

        {error && <p style={{ color: 'var(--nebula-magenta)', fontSize: '0.84rem', margin: 0 }}>{error}</p>}

        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {targets.length > 0 ? `${targets.length} chapter${targets.length !== 1 ? 's' : ''} will be exported.` : 'No chapters match this selection.'}
        </div>

        <div className="hero-actions">
          <button
            id="export-confirm-btn"
            className="primary-button"
            onClick={() => void handleExport()}
            disabled={exporting || targets.length === 0}
          >
            {exporting ? 'Exporting…' : format === 'pdf' ? 'Open Print Dialog' : 'Export .docx'}
          </button>
          <button className="ghost-button" onClick={onClose}>Cancel</button>
        </div>
      </section>
    </div>
  )
}
