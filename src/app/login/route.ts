import { createAuthHandler } from '~/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const password = process.env.APP_PASSWORD
const handler = password
	? createAuthHandler({ password, upstreamOrigin: 'http://127.0.0.1:8840' })
	: null

const login = (request: Request): Response | Promise<Response> => {
	if (!handler) {
		return new Response('Board login is not configured. You can still draw and view the board.', {
			headers: { 'Cache-Control': 'no-store' },
			status: 503
		})
	}
	return handler(request)
}

export const GET = login
export const POST = login
