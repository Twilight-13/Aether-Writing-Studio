/**
 * Aether MCP Server — exposes all Aether project data as tools for Claude.
 * Runs as a stdio-based MCP server, spawned as a child process by main.ts.
 * 
 * Usage: node dist-electron/mcp-server.js <databasePath>
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'
import { createProjectRepository } from './db.js'

// Database path is passed as argv[2] or defaults to userData
const dbPath = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'aether.db')
mkdirSync(dirname(dbPath), { recursive: true })

const repository = createProjectRepository(dbPath)
import Database from 'better-sqlite3'
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

// ── helpers ────────────────────────────────────────────────────────────────

function queryAll<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  return db.prepare(sql).all(...params) as T[]
}

function queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined
}

function getBlocksForPage(pageId: number) {
  return queryAll<{ block_type: string; content_json: string; sort_order: number }>(
    'SELECT block_type, content_json, sort_order FROM blocks WHERE page_id = ? ORDER BY sort_order, id',
    [pageId],
  ).map((row) => ({
    type: row.block_type,
    data: JSON.parse(row.content_json ?? '{}'),
  }))
}

function findPageByTitle(projectId: number, title: string) {
  return queryOne<{ id: number; title: string }>(
    "SELECT id, title FROM pages WHERE project_id = ? AND title LIKE ? LIMIT 1",
    [projectId, `%${title}%`],
  )
}

function activeProjectId(): number {
  const row = queryOne<{ id: number }>('SELECT id FROM projects WHERE archived = 0 ORDER BY datetime(last_edited_at) DESC LIMIT 1')
  return row?.id ?? 0
}

// ── tool definitions ───────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'get_project_overview',
    description: 'Returns the Overview page content as structured JSON for the active project.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_character',
    description: 'Returns a single character card by name.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
  },
  {
    name: 'get_all_characters',
    description: 'Returns all character card data for the active project.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_lore_section',
    description: 'Returns the content of a named lore section.',
    inputSchema: { type: 'object', properties: { section_name: { type: 'string' } }, required: ['section_name'] },
  },
  {
    name: 'get_chapter',
    description: 'Returns chapter body + metadata by arc and chapter number.',
    inputSchema: {
      type: 'object',
      properties: { arc: { type: 'number' }, chapter: { type: 'number' } },
      required: ['arc', 'chapter'],
    },
  },
  {
    name: 'get_arc_outline',
    description: 'Returns arc overview and chapter list for a given arc number.',
    inputSchema: { type: 'object', properties: { arc: { type: 'number' } }, required: ['arc'] },
  },
  {
    name: 'get_full_outline',
    description: 'Returns the complete arc and chapter structure for the active project.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_projects',
    description: 'Lists all available projects. Important for finding the target project ID.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'create_project',
    description: 'Creates a new Aether project workspace. type must be either "novel" or "notes".',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['novel', 'notes'] }
      },
      required: ['name', 'type']
    }
  },
  {
    name: 'delete_project',
    description: 'Deletes a project permanently. Caution!',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'number' } },
      required: ['projectId']
    }
  },
  {
    name: 'get_world_map_locations',
    description: 'Returns all map pins and their descriptions.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_humanizer_rules',
    description: 'Returns the humanizer rules block content.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_context_bundle',
    description: 'Returns a full context package: project overview, all characters, relevant lore, arc outline, previous chapter summary, and humanizer rules.',
    inputSchema: {
      type: 'object',
      properties: { arc: { type: 'number' }, chapter: { type: 'number' } },
      required: ['arc', 'chapter'],
    },
  },
  {
    name: 'search_content',
    description: 'Full-text search across all project content. Returns matches with page/chapter references.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
  {
    name: 'add_world_map_location',
    description: 'Creates a new pin on the world map. Claude should use default x:100, y:100 for locations.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['city', 'dungeon', 'landmark', 'region', 'country', 'other'] },
        description: { type: 'string' },
      },
      required: ['name', 'type'],
    },
  },
  {
    name: 'update_world_map_location',
    description: 'Updates an existing map pin.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        type: { type: 'string', enum: ['city', 'dungeon', 'landmark', 'region', 'country', 'other'] },
        description: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_world_map_location',
    description: 'Deletes a map pin by id.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'create_page',
    description: 'Creates a new page in the active project. Example page_type: "chapter", "lore", "character".',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        parent_id: { type: 'number' },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_pages',
    description: 'Lists all pages in the current project, returning their IDs, titles, and hierarchical parent IDs.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_page',
    description: 'Retrieves all blocks and content for a given page ID.',
    inputSchema: {
      type: 'object',
      properties: { pageId: { type: 'number' } },
      required: ['pageId']
    }
  },
  {
    name: 'delete_page',
    description: 'Permanently deletes a page and all its blocks by ID.',
    inputSchema: {
      type: 'object',
      properties: { pageId: { type: 'number' } },
      required: ['pageId']
    }
  },
  {
    name: 'save_page',
    description: 'Overwrites the blocks of a page. Blocks must be an array of objects matching PageBlock schema (blockKey, type, data).',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'number' },
        title: { type: 'string' },
        blocks: { type: 'array', items: { type: 'object' } },
        createVersion: { type: 'boolean' }
      },
      required: ['pageId', 'title', 'blocks']
    }
  },
  {
    name: 'add_comment',
    description: 'Adds an editorial comment to a specific block on a page.',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'number' },
        blockKey: { type: 'string' },
        body: { type: 'string' }
      },
      required: ['pageId', 'blockKey', 'body']
    }
  }
]

// ── handler ────────────────────────────────────────────────────────────────

async function handleTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  // Global tools that don't need an active project
  if (name === 'list_projects') {
    return repository.listProjects()
  }
  if (name === 'create_project') {
    const pName = String(args.name)
    const pType = String(args.type) as 'novel' | 'notes'
    return repository.createProject({ name: pName, type: pType })
  }
  if (name === 'delete_project') {
    const pId = Number(args.projectId)
    repository.deleteProject(pId)
    return { success: true, deletedProjectId: pId }
  }

  const projectId = activeProjectId()
  if (!projectId) return { error: 'No active project found in database.' }

  switch (name) {
    case 'get_project_overview': {
      const page = findPageByTitle(projectId, 'Overview')
      if (!page) return { error: 'Overview page not found.' }
      const blocks = getBlocksForPage(page.id)
      return { pageId: page.id, title: page.title, blocks }
    }

    case 'list_pages': {
      return { pages: repository.listPages(projectId) }
    }

    case 'get_page': {
      const pId = Number(args.pageId)
      return repository.getPage(pId)
    }

    case 'delete_page': {
      const pId = Number(args.pageId)
      repository.deletePage(pId)
      return { success: true, deletedPageId: pId }
    }

    case 'get_character': {
      const charName = String(args.name ?? '')
      const charPage = findPageByTitle(projectId, 'Characters')
      if (!charPage) return { error: 'Characters page not found.' }
      const blocks = getBlocksForPage(charPage.id)
      const card = blocks.find((b) => b.type === 'character-card' && String(b.data.name ?? '').toLowerCase().includes(charName.toLowerCase()))
      return card ?? { error: `Character not found: ${charName}` }
    }

    case 'get_all_characters': {
      const charPage = findPageByTitle(projectId, 'Characters')
      if (!charPage) return { error: 'Characters page not found.' }
      const blocks = getBlocksForPage(charPage.id)
      return blocks.filter((b) => b.type === 'character-card').map((b) => b.data)
    }

    case 'get_lore_section': {
      const sectionName = String(args.section_name ?? '').toLowerCase()
      const lorePage = findPageByTitle(projectId, 'Lore')
      if (!lorePage) return { error: 'Lore & History page not found.' }
      const blocks = getBlocksForPage(lorePage.id)
      const section = blocks.find((b) => b.type === 'lore-section' && String(b.data.title ?? '').toLowerCase().includes(sectionName))
      return section ? { pageId: lorePage.id, data: section.data } : { error: `Lore section not found: ${args.section_name}` }
    }

    case 'get_chapter': {
      const arcNum = Number(args.arc)
      const chapNum = Number(args.chapter)
      // Find arc page
      const outlinePage = findPageByTitle(projectId, 'Arc & Chapters Outline')
      if (!outlinePage) return { error: 'Outline page not found.' }
      const arcPages = queryAll<{ id: number; title: string; parent_id: number }>(
        'SELECT id, title, parent_id FROM pages WHERE project_id = ? AND parent_id = ?',
        [projectId, outlinePage.id],
      ).filter((p) => p.title.toLowerCase().startsWith(`arc ${arcNum}`))
      if (arcPages.length === 0) return { error: `Arc ${arcNum} not found.` }
      const arcPage = arcPages[0]
      const chapPages = queryAll<{ id: number; title: string }>(
        'SELECT id, title FROM pages WHERE project_id = ? AND parent_id = ? ORDER BY sort_order, id',
        [projectId, arcPage.id],
      )
      const chapPage = chapPages[chapNum - 1]
      if (!chapPage) return { error: `Chapter ${chapNum} not found in Arc ${arcNum}.` }
      const blocks = getBlocksForPage(chapPage.id)
      return { pageId: chapPage.id, title: chapPage.title, blocks, arcNumber: arcNum, chapterNumber: chapNum }
    }

    case 'get_arc_outline': {
      const arcNum = Number(args.arc)
      const outlinePage = findPageByTitle(projectId, 'Outline')
      if (!outlinePage) return { error: 'Outline page not found.' }
      const outlineBlocks = getBlocksForPage(outlinePage.id)
      const arcCard = outlineBlocks.find((b) => b.type === 'arc-card' && b.data.arcNumber === arcNum)
      return arcCard?.data ?? { error: `Arc ${arcNum} card not found in outline.` }
    }

    case 'get_full_outline': {
      const outlinePage = findPageByTitle(projectId, 'Outline')
      if (!outlinePage) return { error: 'Outline page not found.' }
      const blocks = getBlocksForPage(outlinePage.id)
      return { blocks }
    }

    case 'get_world_map_locations': {
      // World map pins stored in world_map_locations table if it exists
      try {
        const locs = queryAll('SELECT * FROM world_map_locations WHERE project_id = ?', [projectId])
        return { locations: locs }
      } catch {
        return { locations: [], note: 'World map table not yet initialized.' }
      }
    }

    case 'get_humanizer_rules': {
      const outlinePage = findPageByTitle(projectId, 'Outline')
      if (!outlinePage) return { error: 'Outline page not found.' }
      const blocks = getBlocksForPage(outlinePage.id)
      const rulesBlock = blocks.find((b) => b.type === 'humanizer-rules')
      return rulesBlock?.data ?? { rules: 'Humanizer rules not found.' }
    }

    case 'get_context_bundle': {
      const arcNum = Number(args.arc)
      const chapNum = Number(args.chapter)

      const [overview, characters, lore, fullOutline, humanizer] = await Promise.all([
        handleTool('get_project_overview', {}),
        handleTool('get_all_characters', {}),
        (async () => {
          const lorePage = findPageByTitle(projectId, 'Lore')
          if (!lorePage) return []
          return getBlocksForPage(lorePage.id).filter((b) => b.type === 'lore-section').map((b) => b.data)
        })(),
        handleTool('get_arc_outline', { arc: arcNum }),
        handleTool('get_humanizer_rules', {}),
      ])

      let prevChapter: unknown = null
      if (chapNum > 1) {
        prevChapter = await handleTool('get_chapter', { arc: arcNum, chapter: chapNum - 1 })
      }

      return {
        project_overview: overview,
        all_characters: characters,
        lore_sections: lore,
        arc_outline: fullOutline,
        previous_chapter: prevChapter,
        humanizer_rules: humanizer,
        requested: { arc: arcNum, chapter: chapNum },
      }
    }

    case 'search_content': {
      const query = String(args.query ?? '').trim()
      if (!query) return { results: [] }
      const pattern = `%${query}%`
      const rows = queryAll<{ page_id: number; block_type: string; content_json: string }>(
        `SELECT b.page_id, b.block_type, b.content_json
         FROM blocks b
         JOIN pages p ON p.id = b.page_id
         WHERE p.project_id = ? AND b.content_json LIKE ?
         LIMIT 30`,
        [projectId, pattern],
      )
      const pages = queryAll<{ id: number; title: string }>(
        'SELECT id, title FROM pages WHERE project_id = ?',
        [projectId],
      )
      const pageMap = new Map(pages.map((p) => [p.id, p.title]))
      return {
        query,
        results: rows.map((row) => ({
          pageTitle: pageMap.get(row.page_id) ?? `Page ${row.page_id}`,
          blockType: row.block_type,
          excerpt: JSON.parse(row.content_json ?? '{}'),
        })),
      }
    }

    case 'add_world_map_location': {
      const pinId = `pin-${Math.random().toString(36).slice(2)}`
      const pin = {
        id: pinId,
        projectId,
        name: String(args.name),
        type: String(args.type),
        x: 100,
        y: 100,
        description: args.description ? String(args.description) : '',
        connections: args.connections ? (args.connections as string[]) : [],
      }
      repository.saveMapPin(pin)
      return { success: true, message: 'Map pin added successfully. User can position it in UI.', pin }
    }

    case 'update_world_map_location': {
      const pins = repository.listMapPins(projectId)
      const pinId = String(args.id)
      const existing = pins.find((p) => p.id === pinId)
      if (!existing) return { error: `Pin not found: ${pinId}` }
      
      const pin = {
        ...existing,
        name: args.name ? String(args.name) : existing.name,
        type: args.type ? String(args.type) : existing.type,
        description: args.description ? String(args.description) : existing.description,
      }
      repository.saveMapPin(pin)
      return { success: true, pin }
    }

    case 'delete_world_map_location': {
      repository.deleteMapPin(String(args.id))
      return { success: true, message: `Deleted pin ${args.id}` }
    }

    case 'create_page': {
      try {
        const page = repository.createPage({
          projectId,
          title: String(args.title),
          parentId: args.parent_id ? Number(args.parent_id) : null
        })
        return { success: true, page }
      } catch (err: any) {
        return { error: err.message }
      }
    }

    case 'save_page': {
      try {
        const doc = repository.savePage({
          pageId: Number(args.pageId),
          title: String(args.title),
          blocks: args.blocks as any[], // PageBlock[]
          createVersion: Boolean(args.createVersion)
        })
        return { success: true, message: 'Page saved.', doc }
      } catch (err: any) {
        return { error: err.message }
      }
    }

    case 'add_comment': {
      try {
        const doc = repository.addComment({
          pageId: Number(args.pageId),
          blockKey: String(args.blockKey),
          body: String(args.body)
        })
        return { success: true, message: 'Comment added.', doc }
      } catch (err: any) {
        return { error: err.message }
      }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// ── server setup ───────────────────────────────────────────────────────────

const server = new Server(
  { name: 'aether-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const result = await handleTool(name, (args ?? {}) as Record<string, unknown>)
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
