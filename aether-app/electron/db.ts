import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export type ProjectType = 'notes' | 'novel' | 'story'
export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'quote'
  | 'callout'
  | 'toggle'
  | 'ordered-list'
  | 'unordered-list'
  | 'todo'
  | 'table'
  | 'image'
  | 'link'
  | 'divider'
  | 'code'
  | 'overview-title'
  | 'story-section'
  | 'genre-tone'
  | 'lead-characters'
  | 'key-highlights'
  | 'character-card'
  | 'lore-section'
  | 'outline-header'
  | 'humanizer-rules'
  | 'arc-card'
  | 'chapter-link-card'
  | 'chapter-identity'
  | 'chapter-type'
  | 'chapter-body'
  | 'key-points'
  | 'chapter-length'

export type ProjectSummary = {
  id: number
  name: string
  type: ProjectType
  lastEditedAt: string
  accentColor: string
  icon: string
  archived: boolean
  synopsis: string
}

export type PageSummary = {
  id: number
  projectId: number
  parentId: number | null
  title: string
  pageType: string
  sortOrder: number
}

export type PageBlock = {
  blockKey: string
  type: BlockType
  data: Record<string, unknown>
}

export type PageComment = {
  id: number
  pageId: number
  blockKey: string
  body: string
  createdAt: string
}

export type PageVersion = {
  id: number
  pageId: number
  createdAt: string
}

export type PageDocument = {
  page: PageSummary
  blocks: PageBlock[]
  comments: PageComment[]
  versions: PageVersion[]
}

type NewProjectInput = {
  name: string
  type: ProjectType
}

type CreatePageInput = {
  projectId: number
  parentId: number | null
  title: string
}

type MovePageInput = {
  pageId: number
  targetPageId: number
}

type SavePageInput = {
  pageId: number
  title: string
  blocks: PageBlock[]
  createVersion: boolean
}

type AddCommentInput = {
  pageId: number
  blockKey: string
  body: string
}

type RestoreVersionInput = {
  pageId: number
  versionId: number
}

type ProjectRow = {
  id: number
  name: string
  type: ProjectType
  last_edited_at: string
  accent_color: string
  icon: string
  archived: number
  synopsis: string
}

type PageRow = {
  id: number
  project_id: number
  parent_id: number | null
  title: string
  page_type: string
  sort_order: number
}

type BlockRow = {
  id: number
  page_id: number
  block_key: string
  block_type: BlockType
  content_json: string
  sort_order: number
}

type CommentRow = {
  id: number
  page_id: number
  block_key: string
  body: string
  created_at: string
}

type VersionRow = {
  id: number
  page_id: number
  snapshot_json: string
  created_at: string
}

type VersionSnapshot = {
  title: string
  blocks: PageBlock[]
}

function mapProject(row: ProjectRow): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    lastEditedAt: row.last_edited_at,
    accentColor: row.accent_color,
    icon: row.icon,
    archived: Boolean(row.archived),
    synopsis: row.synopsis,
  }
}

function mapPage(row: PageRow): PageSummary {
  return {
    id: row.id,
    projectId: row.project_id,
    parentId: row.parent_id,
    title: row.title,
    pageType: row.page_type,
    sortOrder: row.sort_order,
  }
}

function mapComment(row: CommentRow): PageComment {
  return {
    id: row.id,
    pageId: row.page_id,
    blockKey: row.block_key,
    body: row.body,
    createdAt: row.created_at,
  }
}

function mapVersion(row: VersionRow): PageVersion {
  return {
    id: row.id,
    pageId: row.page_id,
    createdAt: row.created_at,
  }
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function paletteFor(type: ProjectType) {
  if (type === 'notes') {
    return { accentColor: '#FF6DB0', icon: 'NT' }
  }

  if (type === 'story') {
    return { accentColor: '#00D4C8', icon: 'ST' }
  }

  return { accentColor: '#9B6DFF', icon: 'NV' }
}

function createBlock(blockKey: string, type: BlockType, data: Record<string, unknown>): PageBlock {
  return { blockKey, type, data }
}

function defaultBlocks(): PageBlock[] {
  return [
    createBlock('intro-heading', 'heading1', { text: 'Untitled Page' }),
    createBlock('intro-copy', 'paragraph', {
      text: 'Start writing here.',
    }),
  ]
}

function normalizeBlocks(blocks: PageBlock[]): PageBlock[] {
  const seen = new Set<string>()
  const normalized = blocks
    .map((block, index) => {
      const safeKey = block.blockKey.trim() || `block-${index + 1}`
      if (seen.has(safeKey)) {
        return null
      }

      seen.add(safeKey)
      return {
        blockKey: safeKey,
        type: block.type,
        data: block.data ?? {},
      } satisfies PageBlock
    })
    .filter((block): block is PageBlock => block !== null)

  return normalized.length > 0 ? normalized : defaultBlocks()
}

function calculateWordCount(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function synchronizeChapterMetrics(blocks: PageBlock[]) {
  const chapterBody = blocks.find((block) => block.type === 'chapter-body')
  const chapterLength = blocks.find((block) => block.type === 'chapter-length')
  if (!chapterBody || !chapterLength) {
    return blocks
  }

  const words = calculateWordCount(String(chapterBody.data.text ?? ''))
  return blocks.map((block) =>
    block.type === 'chapter-length'
      ? {
          ...block,
          data: {
            ...block.data,
            words,
            text: `${words} words`,
          },
        }
      : block,
  )
}

export function createProjectRepository(databasePath: string) {
  mkdirSync(dirname(databasePath), { recursive: true })
  const database = new Database(databasePath)

  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')

  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('notes', 'novel', 'story')),
      synopsis TEXT NOT NULL DEFAULT '',
      accent_color TEXT NOT NULL,
      icon TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      last_edited_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      parent_id INTEGER,
      title TEXT NOT NULL,
      page_type TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES pages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL,
      block_key TEXT NOT NULL DEFAULT '',
      block_type TEXT NOT NULL,
      content_json TEXT NOT NULL DEFAULT '{}',
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL,
      block_key TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS world_map_locations (
      id TEXT PRIMARY KEY,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      pos_x REAL NOT NULL,
      pos_y REAL NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      connections_json TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      profile_json TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS arcs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      arc_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      arc_id INTEGER,
      chapter_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      chapter_type TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      word_count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (arc_id) REFERENCES arcs(id) ON DELETE SET NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_blocks_page_key
      ON blocks(page_id, block_key);
  `)

  database
    .prepare(`
      UPDATE blocks
      SET block_key = 'legacy-' || id
      WHERE block_key = ''
    `)
    .run()

  const insertProject = database.prepare(`
    INSERT INTO projects (name, type, synopsis, accent_color, icon, archived, last_edited_at)
    VALUES (@name, @type, @synopsis, @accentColor, @icon, 0, @lastEditedAt)
  `)

  const createPageStatement = database.prepare(`
    INSERT INTO pages (project_id, parent_id, title, page_type, sort_order)
    VALUES (@projectId, @parentId, @title, 'page', @sortOrder)
  `)

  const upsertBlockStatement = database.prepare(`
    INSERT INTO blocks (page_id, block_key, block_type, content_json, sort_order)
    VALUES (@pageId, @blockKey, @blockType, @contentJson, @sortOrder)
    ON CONFLICT(page_id, block_key)
    DO UPDATE SET
      block_type = excluded.block_type,
      content_json = excluded.content_json,
      sort_order = excluded.sort_order
  `)

  const loadPageStatement = database.prepare(`
    SELECT id, project_id, parent_id, title, page_type, sort_order
    FROM pages
    WHERE id = ?
  `)

  const listPagesStatement = database.prepare(`
    SELECT id, project_id, parent_id, title, page_type, sort_order
    FROM pages
    WHERE project_id = ?
    ORDER BY COALESCE(parent_id, 0), sort_order, id
  `)

  const listBlocksStatement = database.prepare(`
    SELECT id, page_id, block_key, block_type, content_json, sort_order
    FROM blocks
    WHERE page_id = ?
    ORDER BY sort_order, id
  `)

  const listCommentsStatement = database.prepare(`
    SELECT id, page_id, block_key, body, created_at
    FROM comments
    WHERE page_id = ?
    ORDER BY datetime(created_at) DESC, id DESC
  `)

  const listVersionsStatement = database.prepare(`
    SELECT id, page_id, snapshot_json, created_at
    FROM versions
    WHERE page_id = ?
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT 25
  `)

  const projectByIdStatement = database.prepare(`
    SELECT id, name, type, synopsis, accent_color, icon, archived, last_edited_at
    FROM projects
    WHERE id = ?
  `)

  const listProjectsStatement = database.prepare(`
    SELECT id, name, type, synopsis, accent_color, icon, archived, last_edited_at
    FROM projects
    WHERE archived = 0
    ORDER BY datetime(last_edited_at) DESC, id DESC
  `)

  const countProjectsStatement = database.prepare(`
    SELECT COUNT(*) AS count
    FROM projects
    WHERE archived = 0
  `)

  const countPagesForProjectStatement = database.prepare(`
    SELECT COUNT(*) AS count
    FROM pages
    WHERE project_id = ?
  `)

  const maxSortOrderStatement = database.prepare(`
    SELECT COALESCE(MAX(sort_order), -1) AS maxSortOrder
    FROM pages
    WHERE project_id = @projectId AND (
      (parent_id IS NULL AND @parentId IS NULL) OR
      parent_id = @parentId
    )
  `)

  const updateProjectTimestampStatement = database.prepare(`
    UPDATE projects
    SET last_edited_at = ?
    WHERE id = ?
  `)

  const updatePageStatement = database.prepare(`
    UPDATE pages
    SET title = ?
    WHERE id = ?
  `)

  const deleteRemovedBlocksStatement = database.prepare(`
    DELETE FROM blocks
    WHERE page_id = ?
      AND block_key NOT IN (SELECT value FROM json_each(?))
  `)

  const deleteAllBlocksStatement = database.prepare(`
    DELETE FROM blocks
    WHERE page_id = ?
  `)

  const deleteRemovedCommentsStatement = database.prepare(`
    DELETE FROM comments
    WHERE page_id = ?
      AND block_key NOT IN (SELECT value FROM json_each(?))
  `)

  const deleteAllCommentsStatement = database.prepare(`
    DELETE FROM comments
    WHERE page_id = ?
  `)

  const insertVersionStatement = database.prepare(`
    INSERT INTO versions (page_id, snapshot_json, created_at)
    VALUES (?, ?, ?)
  `)

  const insertCommentStatement = database.prepare(`
    INSERT INTO comments (page_id, block_key, body, created_at)
    VALUES (?, ?, ?, ?)
  `)

  const versionByIdStatement = database.prepare(`
    SELECT id, page_id, snapshot_json, created_at
    FROM versions
    WHERE id = ? AND page_id = ?
  `)

  const pageProjectStatement = database.prepare(`
    SELECT project_id
    FROM pages
    WHERE id = ?
  `)

  const pageByIdStatement = database.prepare(`
    SELECT id, project_id, parent_id, title, page_type, sort_order
    FROM pages
    WHERE id = ?
  `)

  const listMapPinsStatement = database.prepare(`
    SELECT id, project_id, name, type, pos_x, pos_y, description, connections_json
    FROM world_map_locations
    WHERE project_id = ?
  `)

  const upsertMapPinStatement = database.prepare(`
    INSERT INTO world_map_locations (id, project_id, name, type, pos_x, pos_y, description, connections_json)
    VALUES (@id, @projectId, @name, @type, @x, @y, @description, @connectionsJson)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      pos_x = excluded.pos_x,
      pos_y = excluded.pos_y,
      description = excluded.description,
      connections_json = excluded.connections_json
  `)

  const deleteMapPinStatement = database.prepare(`
    DELETE FROM world_map_locations WHERE id = ?
  `)

  const movePageTransaction = database.transaction((input: MovePageInput) => {
    const moving = pageByIdStatement.get(input.pageId) as PageRow | undefined
    const target = pageByIdStatement.get(input.targetPageId) as PageRow | undefined

    if (!moving || !target || moving.id === target.id) {
      return
    }

    database
      .prepare(
        `
          UPDATE pages
          SET sort_order = sort_order + 1
          WHERE project_id = ?
            AND (
              (parent_id IS NULL AND ? IS NULL) OR
              parent_id = ?
            )
            AND sort_order > ?
            AND id != ?
        `,
      )
      .run(target.project_id, target.parent_id, target.parent_id, target.sort_order, moving.id)

    database
      .prepare(`
        UPDATE pages
        SET parent_id = ?, sort_order = ?
        WHERE id = ?
      `)
      .run(target.parent_id, target.sort_order + 1, moving.id)

    updateProjectTimestampStatement.run(new Date().toISOString(), moving.project_id)
  })

  const savePageTransaction = database.transaction((input: SavePageInput) => {
    const pageRow = loadPageStatement.get(input.pageId) as PageRow | undefined
    if (!pageRow) {
      throw new Error('Page not found.')
    }

    const blocks = synchronizeChapterMetrics(normalizeBlocks(input.blocks))
    const blockKeysJson = JSON.stringify(blocks.map((block) => block.blockKey))

    updatePageStatement.run(input.title.trim() || 'Untitled Page', input.pageId)

    if (blocks.length === 0) {
      deleteAllBlocksStatement.run(input.pageId)
      deleteAllCommentsStatement.run(input.pageId)
    } else {
      deleteRemovedBlocksStatement.run(input.pageId, blockKeysJson)
      deleteRemovedCommentsStatement.run(input.pageId, blockKeysJson)
    }

    for (const [index, block] of blocks.entries()) {
      upsertBlockStatement.run({
        pageId: input.pageId,
        blockKey: block.blockKey,
        blockType: block.type,
        contentJson: JSON.stringify(block.data),
        sortOrder: index,
      })
    }

    const now = new Date().toISOString()
    if (input.createVersion) {
      const snapshot: VersionSnapshot = {
        title: input.title.trim() || 'Untitled Page',
        blocks,
      }
      insertVersionStatement.run(input.pageId, JSON.stringify(snapshot), now)
    }

    updateProjectTimestampStatement.run(now, pageRow.project_id)
  })

  function seedNotesProject(projectId: number) {
    const existing = countPagesForProjectStatement.get(projectId) as { count: number }
    if (existing.count > 0) {
      return
    }

    const createSeedPage = (title: string, parentId: number | null, sortOrder: number) => {
      const result = createPageStatement.run({
        projectId,
        parentId,
        title,
        sortOrder,
      })

      return Number(result.lastInsertRowid)
    }

    const overviewPageId = createSeedPage('Project Overview', null, 0)
    const researchPageId = createSeedPage('Research', null, 1)
    createSeedPage('Reference', null, 2)
    createSeedPage('Scraps', null, 3)
    createSeedPage('Character Fragments', researchPageId, 0)

    const overviewBlocks = [
      createBlock('overview-h1', 'heading1', { text: 'Project Overview' }),
      createBlock('overview-intro', 'paragraph', {
        text: 'This workspace is your local notebook for concepts, fragments, and structured story research.',
      }),
      createBlock('overview-callout', 'callout', {
        text: 'Use the toolbar to add headings, notes, tables, checklists, and lightweight media references.',
        tone: 'starlight',
      }),
      createBlock('overview-h2', 'heading2', { text: 'Current threads' }),
      createBlock('overview-list-a', 'unordered-list', {
        text: 'Refine the magic system notes',
      }),
      createBlock('overview-list-b', 'unordered-list', {
        text: 'Capture voice references for the antagonist',
      }),
      createBlock('overview-code', 'code', {
        language: 'md',
        code: '## Scene spark\nA city built on old observatories begins to move at night.',
      }),
    ]

    savePageTransaction({
      pageId: overviewPageId,
      title: 'Project Overview',
      blocks: overviewBlocks,
      createVersion: true,
    })
  }

  function seedWritingProject(projectId: number, projectName: string) {
    const existing = countPagesForProjectStatement.get(projectId) as { count: number }
    if (existing.count > 0) {
      return
    }

    const createSeedPage = (title: string, parentId: number | null, sortOrder: number) => {
      const result = createPageStatement.run({
        projectId,
        parentId,
        title,
        sortOrder,
      })

      return Number(result.lastInsertRowid)
    }

    const overviewPageId = createSeedPage('Overview', null, 0)
    const charactersPageId = createSeedPage('Characters', null, 1)
    const lorePageId = createSeedPage('Lore & History', null, 2)
    const outlinePageId = createSeedPage('Arc & Chapters Outline', null, 3)
    const arcPageId = createSeedPage('Arc 1 - Fracture Light', outlinePageId, 0)
    const chapterPageId = createSeedPage('Chapter 1 - First Light', arcPageId, 0)

    const chapterBody =
      'The observatory groaned as it crossed the dunes, its brass ribs singing against the wind while Aria counted the stars she could no longer trust.'
    const chapterWords = calculateWordCount(chapterBody)

    savePageTransaction({
      pageId: overviewPageId,
      title: 'Overview',
      blocks: [
        createBlock('overview-title', 'overview-title', {
          title: projectName,
          summary:
            'A story about scholars, drifting observatories, and the cost of reading meaning into the sky.',
        }),
        createBlock('core-concept', 'story-section', {
          label: 'Core Concept',
          title: 'What this story is really about',
          body:
            'A former celestial navigator discovers the empire has been rewriting history through the stars themselves.',
        }),
        createBlock('genre-tone', 'genre-tone', {
          genres: 'dark fantasy, cosmic mystery, literary adventure',
          tone: 'Intimate, ominous, and wonder-struck.',
        }),
        createBlock('lead-characters', 'lead-characters', {
          characters: 'Aria Vale\nTomas Wren\nThe Glass Choir',
        }),
        createBlock('key-highlights', 'key-highlights', {
          items:
            'Observatories move across the landscape like ships.\nMemory and astronomy are bound together.\nEvery arc changes what the sky means to the cast.',
        }),
      ],
      createVersion: true,
    })

    savePageTransaction({
      pageId: charactersPageId,
      title: 'Characters',
      blocks: [
        createBlock('character-aria', 'character-card', {
          name: 'Aria Vale',
          roleType: 'Protagonist',
          age: '27',
          quote: 'The sky only lies to people who think it is passive.',
          roleInStory: 'A disgraced navigator chasing proof that the star charts are being altered.',
          abilities: 'Celestial mapping, multilingual cipher work, ruthless pattern recognition.',
          physicalDescription: 'Lean, weathered, ink stains on both hands, silver-threaded coat.',
          psychologicalProfile: 'Obsessive, grieving, incapable of abandoning a broken mystery.',
          relationships: 'Uneasy alliance with Tomas. Haunted reverence for the Glass Choir.',
          customFields: 'Signature object: an inherited brass sextant.',
          arcNotes: 'Moves from private grief to public defiance.',
          members: '',
          groupDynamics: '',
          collectiveGoal: '',
        }),
        createBlock('character-choir', 'character-card', {
          name: 'The Glass Choir',
          roleType: 'Group',
          age: 'Ancient order',
          quote: 'We keep the heavens honest.',
          roleInStory: 'A faction of scholars who guard the original sky records.',
          abilities: 'Choral memory work, archive protection, ritual astronomy.',
          physicalDescription: 'Masked archivists wrapped in mirrored veils.',
          psychologicalProfile: 'Disciplined, secretive, terrified of open collapse.',
          relationships: 'Protective of Aria but divided on whether to trust her.',
          customFields: 'Seat of power: the Shattered Orrery.',
          arcNotes: 'Splinters as the story reveals their compromises.',
          members: 'Liora Sen\nBrother Cassian\nMira-of-the-Lens',
          groupDynamics: 'Ritual hierarchy with hidden rivalries beneath the vows.',
          collectiveGoal: 'Preserve the unedited sky maps before the empire erases them.',
        }),
      ],
      createVersion: true,
    })

    savePageTransaction({
      pageId: lorePageId,
      title: 'Lore & History',
      blocks: [
        createBlock('lore-history', 'lore-section', {
          title: 'World History',
          body: 'The empire built traveling observatories to watch for celestial fractures after the Ashfall Century.',
          open: true,
        }),
        createBlock('lore-factions', 'lore-section', {
          title: 'Factions',
          body: 'The Glass Choir, the Crown Survey, and the Salt Cartographers all claim ownership of the sky record.',
          open: false,
        }),
        createBlock('lore-system', 'lore-section', {
          title: 'Magic / Tech System',
          body: 'Star-reading lets skilled navigators alter memory resonance in places where constellations are anchored to stone.',
          open: false,
        }),
        createBlock('lore-geography', 'lore-section', {
          title: 'Geography',
          body: 'A desert of glass salt, drifting mountain rails, and observatory-cities that never stop moving.',
          open: false,
        }),
      ],
      createVersion: true,
    })

    savePageTransaction({
      pageId: outlinePageId,
      title: 'Arc & Chapters Outline',
      blocks: [
        createBlock('outline-header', 'outline-header', {
          storyTitle: projectName,
          tagline: 'When the heavens are rewritten, memory becomes rebellion.',
          beginning: 'Aria discovers her late mentor left behind a corrupted chart.',
          ending: 'The cast chooses which version of history the sky will preserve.',
        }),
        createBlock('humanizer-rules', 'humanizer-rules', {
          rules:
            'Vary sentence rhythm.\nAvoid generic AI phrasing.\nUse subtext in dialogue.\nEnd chapters with motion, not neutrality.',
        }),
        createBlock('arc-1', 'arc-card', {
          arcPageId,
          arcNumber: 1,
          title: 'Fracture Light',
          overview: 'Aria returns to the moving observatory network and realizes the official charts have been tampered with.',
          purpose: 'Establish the core conspiracy, the main cast, and the emotional cost of looking deeper.',
          emotion: 'Uneasy, luminous, and tightening.',
          chapters: [
            {
              chapterPageId,
              title: 'Chapter 1 - First Light',
              synopsis: 'Aria boards the observatory and notices a star that should not exist.',
            },
          ],
        }),
      ],
      createVersion: true,
    })

    savePageTransaction({
      pageId: arcPageId,
      title: 'Arc 1 - Fracture Light',
      blocks: [
        createBlock('arc-overview', 'story-section', {
          label: 'Arc Overview',
          title: 'Arc 1 in detail',
          body: 'Aria reunites with the institutions she distrusts and learns the records have been weaponized.',
        }),
        createBlock('arc-turning-points', 'story-section', {
          label: 'Turning Points',
          title: 'Key plot turns',
          body: 'The corrupted chart appears.\nThe Glass Choir asks for secrecy.\nAria decides to investigate anyway.',
        }),
        createBlock('arc-dynamics', 'story-section', {
          label: 'Character Dynamics',
          title: 'Who changes here',
          body: 'Aria and Tomas begin as wary allies. The Choir fractures over whether truth is survivable.',
        }),
        createBlock('chapter-link-1', 'chapter-link-card', {
          chapterPageId,
          title: 'Chapter 1 - First Light',
          synopsis: 'Aria boards the observatory and notices a star that should not exist.',
        }),
      ],
      createVersion: true,
    })

    savePageTransaction({
      pageId: chapterPageId,
      title: 'Chapter 1 - First Light',
      blocks: [
        createBlock('chapter-identity', 'chapter-identity', {
          chapterNumber: 1,
          title: 'First Light',
        }),
        createBlock('chapter-type', 'chapter-type', {
          value: 'Revelation',
        }),
        createBlock('chapter-body', 'chapter-body', {
          text: chapterBody,
        }),
        createBlock('chapter-points', 'key-points', {
          items:
            'Aria returns to the observatory.\nA star appears where no star should be.\nThe mystery becomes impossible to ignore.',
        }),
        createBlock('chapter-length', 'chapter-length', {
          words: chapterWords,
          text: `${chapterWords} words`,
        }),
      ],
      createVersion: true,
    })
  }

  function getPage(pageId: number): PageDocument {
    const pageRow = loadPageStatement.get(pageId) as PageRow | undefined
    if (!pageRow) {
      throw new Error('Page not found.')
    }

    const blockRows = listBlocksStatement.all(pageId) as BlockRow[]
    const blocks =
      blockRows.length > 0
        ? blockRows.map((row) => ({
            blockKey: row.block_key,
            type: row.block_type,
            data: parseJson<Record<string, unknown>>(row.content_json, {}),
          }))
        : defaultBlocks()

    if (blockRows.length === 0) {
      savePageTransaction({
        pageId,
        title: pageRow.title,
        blocks,
        createVersion: true,
      })
    }

    const comments = (listCommentsStatement.all(pageId) as CommentRow[]).map(mapComment)
    const versions = (listVersionsStatement.all(pageId) as VersionRow[]).map(mapVersion)

    return {
      page: mapPage(pageRow),
      blocks,
      comments,
      versions,
    }
  }

  return {
    listProjects(): ProjectSummary[] {
      return (listProjectsStatement.all() as ProjectRow[]).map(mapProject)
    },

    createProject(input: NewProjectInput): ProjectSummary {
      const now = new Date().toISOString()
      const palette = paletteFor(input.type)
      const synopsis =
        input.type === 'notes'
          ? 'A flexible workspace for research, notes, and worldbuilding experiments.'
          : 'A fresh story project scaffolded from the Aether long-form writing template.'

      const result = insertProject.run({
        name: input.name,
        type: input.type,
        synopsis,
        accentColor: palette.accentColor,
        icon: palette.icon,
        lastEditedAt: now,
      })

      const created = projectByIdStatement.get(result.lastInsertRowid) as ProjectRow | undefined
      if (!created) {
        throw new Error('Failed to create project record.')
      }

      if (created.type === 'notes') {
        seedNotesProject(created.id)
      } else {
        seedWritingProject(created.id, created.name)
      }

      return mapProject(created)
    },

    listPages(projectId: number): PageSummary[] {
      const rows = listPagesStatement.all(projectId) as PageRow[]
      return rows.map(mapPage)
    },

    getPage(pageId: number): PageDocument {
      return getPage(pageId)
    },

    createPage(input: CreatePageInput): PageSummary {
      const siblingOrder = maxSortOrderStatement.get({
        projectId: input.projectId,
        parentId: input.parentId,
      }) as {
        maxSortOrder: number
      }
      const now = new Date().toISOString()
      const title = input.title.trim() || 'Untitled Page'
      const result = createPageStatement.run({
        projectId: input.projectId,
        parentId: input.parentId,
        title,
        sortOrder: siblingOrder.maxSortOrder + 1,
      })

      const pageId = Number(result.lastInsertRowid)
      savePageTransaction({
        pageId,
        title,
        blocks: defaultBlocks(),
        createVersion: true,
      })
      updateProjectTimestampStatement.run(now, input.projectId)

      const created = loadPageStatement.get(pageId) as PageRow | undefined
      if (!created) {
        throw new Error('Failed to create page.')
      }

      return mapPage(created)
    },

    movePage(input: MovePageInput): PageSummary[] {
      movePageTransaction(input)

      const pageRow = pageProjectStatement.get(input.pageId) as
        | { project_id: number }
        | undefined
      if (!pageRow) {
        throw new Error('Moved page not found.')
      }

      return this.listPages(pageRow.project_id)
    },

    savePage(input: SavePageInput): PageDocument {
      savePageTransaction(input)
      return getPage(input.pageId)
    },

    addComment(input: AddCommentInput): PageDocument {
      const trimmed = input.body.trim()
      if (!trimmed) {
        return getPage(input.pageId)
      }

      insertCommentStatement.run(
        input.pageId,
        input.blockKey,
        trimmed,
        new Date().toISOString(),
      )

      return getPage(input.pageId)
    },

    restoreVersion(input: RestoreVersionInput): PageDocument {
      const version = versionByIdStatement.get(input.versionId, input.pageId) as
        | VersionRow
        | undefined

      if (!version) {
        throw new Error('Version not found.')
      }

      const snapshot = parseJson<VersionSnapshot>(version.snapshot_json, {
        title: 'Untitled Page',
        blocks: defaultBlocks(),
      })

      savePageTransaction({
        pageId: input.pageId,
        title: snapshot.title,
        blocks: snapshot.blocks,
        createVersion: true,
      })

      return getPage(input.pageId)
    },

    deleteProject(projectId: number): void {
      database.prepare('DELETE FROM projects WHERE id = ?').run(projectId)
    },

    deletePage(pageId: number): void {
      database.prepare('DELETE FROM pages WHERE id = ?').run(pageId)
    },

    listMapPins(projectId: number): any[] {
      const rows: any[] = listMapPinsStatement.all(projectId)
      return rows.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        name: row.name,
        type: row.type,
        x: row.pos_x,
        y: row.pos_y,
        description: row.description,
        connections: JSON.parse(row.connections_json),
      }))
    },

    saveMapPin(pin: any): void {
      upsertMapPinStatement.run({
        id: pin.id,
        projectId: pin.projectId,
        name: pin.name,
        type: pin.type,
        x: pin.x,
        y: pin.y,
        description: pin.description,
        connectionsJson: JSON.stringify(pin.connections),
      })
    },

    deleteMapPin(pinId: string): void {
      deleteMapPinStatement.run(pinId)
    },
  }
}
