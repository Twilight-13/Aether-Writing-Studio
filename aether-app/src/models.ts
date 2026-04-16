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

// ── Map types ──────────────────────────────────────────────────────────────

export type LocationType = 'city' | 'dungeon' | 'landmark' | 'region' | 'country' | 'other'

export type MapPin = {
  id: string
  projectId: number
  name: string
  type: LocationType
  x: number
  y: number
  description: string
  connections: string[] // IDs of connected pins
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

export type CreateProjectInput = {
  name: string
  type: ProjectType
}

export type CreatePageInput = {
  projectId: number
  parentId: number | null
  title: string
}

export type MovePageInput = {
  pageId: number
  targetPageId: number
}

export type SavePageInput = {
  pageId: number
  title: string
  blocks: PageBlock[]
  createVersion: boolean
}

export type AddCommentInput = {
  pageId: number
  blockKey: string
  body: string
}

export type RestoreVersionInput = {
  pageId: number
  versionId: number
}

export type DesktopApi = {
  listProjects: () => Promise<ProjectSummary[]>
  createProject: (input: CreateProjectInput) => Promise<ProjectSummary>
  listPages: (projectId: number) => Promise<PageSummary[]>
  getPage: (pageId: number) => Promise<PageDocument>
  createPage: (input: CreatePageInput) => Promise<PageSummary>
  movePage: (input: MovePageInput) => Promise<PageSummary[]>
  savePage: (input: SavePageInput) => Promise<PageDocument>
  addComment: (input: AddCommentInput) => Promise<PageDocument>
  restoreVersion: (input: RestoreVersionInput) => Promise<PageDocument>
  deleteProject: (projectId: number) => Promise<void>
  deletePage: (pageId: number) => Promise<void>

  // Map
  listMapPins: (projectId: number) => Promise<MapPin[]>
  saveMapPin: (pin: MapPin) => Promise<void>
  deleteMapPin: (pinId: string) => Promise<void>
}

export const typeLabels: Record<ProjectType, string> = {
  notes: 'Normal Notes',
  novel: 'Novel / Series',
  story: 'Single Story',
}

export const blockTypeLabels: Record<BlockType, string> = {
  paragraph: 'Paragraph',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  quote: 'Quote',
  callout: 'Callout',
  toggle: 'Toggle',
  'ordered-list': 'Ordered List',
  'unordered-list': 'Bullet List',
  todo: 'To-do',
  table: 'Table',
  image: 'Image',
  link: 'Link',
  divider: 'Divider',
  code: 'Code',
  'overview-title': 'Overview Title',
  'story-section': 'Story Section',
  'genre-tone': 'Genre & Tone',
  'lead-characters': 'Lead Characters',
  'key-highlights': 'Key Highlights',
  'character-card': 'Character Card',
  'lore-section': 'Lore Section',
  'outline-header': 'Outline Header',
  'humanizer-rules': 'Humanizer Rules',
  'arc-card': 'Arc Card',
  'chapter-link-card': 'Chapter Link',
  'chapter-identity': 'Chapter Identity',
  'chapter-type': 'Chapter Type',
  'chapter-body': 'Chapter Body',
  'key-points': 'Key Points',
  'chapter-length': 'Chapter Length',
}

export const blockTypeOptions = Object.keys(blockTypeLabels) as BlockType[]

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function makeBlockKey() {
  return `block-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`
}

export function createEmptyBlock(type: BlockType): PageBlock {
  switch (type) {
    case 'heading1':
      return { blockKey: makeBlockKey(), type, data: { text: 'New heading' } }
    case 'heading2':
      return { blockKey: makeBlockKey(), type, data: { text: 'Section heading' } }
    case 'heading3':
      return { blockKey: makeBlockKey(), type, data: { text: 'Subsection' } }
    case 'quote':
      return { blockKey: makeBlockKey(), type, data: { text: 'A line worth keeping.', source: '' } }
    case 'callout':
      return { blockKey: makeBlockKey(), type, data: { text: 'Important note.', tone: 'starlight' } }
    case 'toggle':
      return {
        blockKey: makeBlockKey(),
        type,
        data: { title: 'Toggle title', content: 'Hidden details live here.', open: true },
      }
    case 'ordered-list':
    case 'unordered-list':
      return { blockKey: makeBlockKey(), type, data: { text: 'List item' } }
    case 'todo':
      return { blockKey: makeBlockKey(), type, data: { text: 'Task item', checked: false } }
    case 'table':
      return { blockKey: makeBlockKey(), type, data: { rows: [['Column A', 'Column B'], ['Item', 'Detail']] } }
    case 'image':
      return { blockKey: makeBlockKey(), type, data: { src: '', caption: 'Image caption' } }
    case 'link':
      return { blockKey: makeBlockKey(), type, data: { label: 'Reference link', url: 'https://example.com' } }
    case 'divider':
      return { blockKey: makeBlockKey(), type, data: {} }
    case 'code':
      return {
        blockKey: makeBlockKey(),
        type,
        data: { language: 'md', code: '## Scene idea\nDescribe what happens next.' },
      }
    case 'overview-title':
      return {
        blockKey: makeBlockKey(),
        type,
        data: {
          title: 'Untitled Story',
          summary: 'A one paragraph summary of the core concept.',
        },
      }
    case 'story-section':
      return {
        blockKey: makeBlockKey(),
        type,
        data: {
          label: 'Section',
          title: 'New Section',
          body: 'Add the details that matter for this story section.',
        },
      }
    case 'genre-tone':
      return {
        blockKey: makeBlockKey(),
        type,
        data: {
          genres: 'dark fantasy, cosmic mystery',
          tone: 'Lyrical, ominous, and intimate.',
        },
      }
    case 'lead-characters':
      return {
        blockKey: makeBlockKey(),
        type,
        data: {
          characters: 'Aria Vale\nJuniper Ash\nCael Rowan',
        },
      }
    case 'key-highlights':
      return {
        blockKey: makeBlockKey(),
        type,
        data: {
          items: 'A world where observatories drift like ships.\nMagic is tied to stellar navigation.',
        },
      }
    case 'character-card':
      return {
        blockKey: makeBlockKey(),
        type,
        data: {
          name: 'New Character',
          roleType: 'Protagonist',
          age: '',
          quote: '',
          roleInStory: '',
          abilities: '',
          physicalDescription: '',
          psychologicalProfile: '',
          relationships: '',
          customFields: '',
          arcNotes: '',
          members: '',
          groupDynamics: '',
          collectiveGoal: '',
        },
      }
    case 'lore-section':
      return {
        blockKey: makeBlockKey(),
        type,
        data: {
          title: 'Lore Section',
          body: 'Capture the history, system rules, or myth connected to this setting.',
          open: true,
        },
      }
    case 'outline-header':
      return {
        blockKey: makeBlockKey(),
        type,
        data: {
          storyTitle: 'Untitled Story',
          tagline: 'A sentence that captures the story promise.',
          beginning: 'Where the story begins.',
          ending: 'Where the story ends.',
        },
      }
    case 'humanizer-rules':
      return {
        blockKey: makeBlockKey(),
        type,
        data: {
          rules:
            'Vary sentence rhythm.\nAvoid generic AI phrasing.\nPrioritize scene over summary.\nPreserve character voice.',
        },
      }
    case 'arc-card':
      return {
        blockKey: makeBlockKey(),
        type,
        data: {
          arcPageId: null,
          arcNumber: 1,
          title: 'Arc I',
          overview: 'What happens in this arc.',
          purpose: 'What this arc establishes.',
          emotion: 'Atmospheric and tense.',
          chapters: [],
        },
      }
    case 'chapter-link-card':
      return {
        blockKey: makeBlockKey(),
        type,
        data: {
          chapterPageId: null,
          title: 'Chapter 1',
          synopsis: 'A one-line synopsis for this chapter.',
        },
      }
    case 'chapter-identity':
      return {
        blockKey: makeBlockKey(),
        type,
        data: {
          chapterNumber: 1,
          title: 'Chapter One',
        },
      }
    case 'chapter-type':
      return {
        blockKey: makeBlockKey(),
        type,
        data: {
          value: 'Revelation',
        },
      }
    case 'chapter-body':
      return {
        blockKey: makeBlockKey(),
        type,
        data: {
          text: 'Write the chapter prose here.',
        },
      }
    case 'key-points':
      return {
        blockKey: makeBlockKey(),
        type,
        data: {
          items: 'Key event one\nKey event two',
        },
      }
    case 'chapter-length':
      return {
        blockKey: makeBlockKey(),
        type,
        data: {
          words: 0,
          text: '0 words',
        },
      }
    case 'paragraph':
    default:
      return { blockKey: makeBlockKey(), type: 'paragraph', data: { text: 'Start writing here.' } }
  }
}

export function getBlockText(block: PageBlock) {
  if (typeof block.data.text === 'string') return block.data.text
  if (typeof block.data.title === 'string') return block.data.title
  if (typeof block.data.label === 'string') return block.data.label
  if (typeof block.data.storyTitle === 'string') return block.data.storyTitle
  if (typeof block.data.name === 'string') return block.data.name
  if (typeof block.data.code === 'string') return block.data.code
  return blockTypeLabels[block.type]
}

export function convertBlockType(block: PageBlock, nextType: BlockType): PageBlock {
  const seed = createEmptyBlock(nextType)
  const text = getBlockText(block)

  if (typeof seed.data.text === 'string') seed.data.text = text
  if (typeof seed.data.title === 'string') seed.data.title = text
  if (typeof seed.data.label === 'string') seed.data.label = text

  return { ...seed, blockKey: block.blockKey }
}

export function getHeadingEntries(blocks: PageBlock[]) {
  return blocks
    .filter((block) => ['heading1', 'heading2', 'heading3'].includes(block.type))
    .map((block) => ({
      blockKey: block.blockKey,
      title: String(block.data.text ?? 'Untitled heading'),
      level: block.type === 'heading1' ? 1 : block.type === 'heading2' ? 2 : 3,
    }))
}

export function buildFlatPages(pages: PageSummary[], parentId: number | null = null, depth = 0) {
  return pages
    .filter((page) => page.parentId === parentId)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)
    .flatMap((page) => [{ ...page, depth }, ...buildFlatPages(pages, page.id, depth + 1)])
}

export function collectDescendantIds(pages: PageSummary[], pageId: number): Set<number> {
  const ids = new Set<number>()
  const visit = (parentId: number) => {
    for (const page of pages) {
      if (page.parentId === parentId) {
        ids.add(page.id)
        visit(page.id)
      }
    }
  }

  visit(pageId)
  return ids
}

export function calculateWordCount(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export function synchronizeChapterMetrics(blocks: PageBlock[]) {
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
