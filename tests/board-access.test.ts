import { afterAll, expect, test } from 'bun:test'
import { createAuthHandler, createLoginHandler, hasBoardSession } from '../src/auth'

const previousPassword = process.env.APP_PASSWORD
const previousDatabase = process.env.DATABASE_PATH
process.env.APP_PASSWORD = 'test-board-password'
process.env.DATABASE_PATH = ':memory:'
const { GET, POST } = await import('../src/app/api/board/route')

afterAll(() => {
	if (previousPassword === undefined) delete process.env.APP_PASSWORD
	else process.env.APP_PASSWORD = previousPassword
	if (previousDatabase === undefined) delete process.env.DATABASE_PATH
	else process.env.DATABASE_PATH = previousDatabase
})

const handler = createLoginHandler({ password: 'test-board-password' })
const login = (password: string, origin = 'https://maker.test') =>
	handler(
		new Request(`${origin}/login?grid=100000000`, {
			body: new URLSearchParams({ password }),
			method: 'POST'
		})
	)

test('the board is public but anonymous and forged sessions cannot add creations', async () => {
	for (const cookie of ['', 'maker_session=forged']) {
		const request = new Request('https://maker.test/api/board', { headers: { cookie } })
		expect(GET().status).toBe(200)
		expect((await POST(request)).status).toBe(401)
	}
	expect(hasBoardSession(new Request('https://maker.test'), '')).toBe(false)
})

test('password allows saving a public creation and preserves the drawing', async () => {
	expect((await login('wrong')).status).toBe(401)
	const response = await login('test-board-password')
	expect(response.status).toBe(303)
	expect(response.headers.get('location')).toBe('/?grid=100000000')
	const cookie = response.headers.get('set-cookie') ?? ''
	expect(cookie).toContain('HttpOnly')
	expect(cookie).toContain('Secure')
	const headers = { cookie: cookie.split(';')[0] ?? '' }
	const saved = await POST(
		new Request('https://maker.test/api/board', {
			body: JSON.stringify({ grid: '100000000' }),
			headers,
			method: 'POST'
		})
	)
	expect(saved.status).toBe(201)
	const board = await GET().json()
	expect(board.creations).toHaveLength(1)
	expect(board.creations[0].grid).toBe('100000000')
})

test('local HTTP login works and the form retains the drawing', async () => {
	const response = await login('test-board-password', 'http://localhost:3000')
	expect(response.headers.get('set-cookie')).not.toContain('; Secure')
	const page = await handler(new Request('http://localhost:3000/login?grid=100000000'))
	expect(await page.text()).toContain('action="/login?grid=100000000"')
})

test('proxy allows anonymous access to the editor and exports', async () => {
	const upstream = Bun.serve({
		fetch: request => new Response(new URL(request.url).pathname),
		port: 0
	})
	try {
		const publicHandler = createAuthHandler({ password: 'test', upstreamOrigin: upstream.url.origin })
		const loginResponse = await publicHandler(new Request('http://localhost/login'))
		expect(await loginResponse.text()).toContain('Log in to add to board')
		for (const path of ['/', '/api/og', '/_next/static/app.js']) {
			const response = await publicHandler(new Request(`http://localhost${path}`))
			expect(response.status).toBe(200)
			expect(await response.text()).toBe(path)
		}
	} finally {
		upstream.stop(true)
	}
})
