import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

export type BoardCreation = {
	createdAt: string
	grid: string
	id: number
}

type BoardRow = {
	created_at: string
	grid: string
	id: number
}

const databasePath = process.env.DATABASE_PATH ?? join(process.cwd(), 'data', 'maker.sqlite')
mkdirSync(dirname(databasePath), { recursive: true })

const database = new Database(databasePath, { create: true })
database.exec('PRAGMA journal_mode = WAL')
database.exec('PRAGMA busy_timeout = 5000')
database.exec(`
	CREATE TABLE IF NOT EXISTS creations (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		grid TEXT NOT NULL UNIQUE,
		created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
	) STRICT;
`)

const serialize = (row: BoardRow): BoardCreation => ({
	createdAt: row.created_at,
	grid: row.grid,
	id: row.id
})

export const listCreations = (limit = 90): BoardCreation[] => {
	const rows = database
		.query('SELECT id, grid, created_at FROM creations ORDER BY id DESC LIMIT ?')
		.all(limit) as BoardRow[]
	return rows.map(serialize)
}

export const addCreation = (grid: string): { created: boolean; creation: BoardCreation } => {
	const result = database.query('INSERT OR IGNORE INTO creations (grid) VALUES (?)').run(grid)
	const row = database
		.query('SELECT id, grid, created_at FROM creations WHERE grid = ?')
		.get(grid) as BoardRow | null

	if (!row) throw new Error('Failed to save creation')
	return { created: result.changes > 0, creation: serialize(row) }
}
