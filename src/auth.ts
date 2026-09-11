import { createHash, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'maker_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7
const FAILURE_LIMIT = 5
const FAILURE_WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURE_ENTRIES = 10_000

type Failure = {
	count: number
	startedAt: number
}

type AuthOptions = {
	password: string
	upstreamOrigin: string
}

const digest = (value: string): Buffer => createHash('sha256').update(value).digest()

const loginPage = (message = '', blocked = false): string => `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="robots" content="noindex, nofollow">
	<title>Maker</title>
	<style>
		* { box-sizing: border-box; }
		body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #fff; color: #111; font-family: system-ui, sans-serif; }
		form { width: min(100%, 320px); display: grid; gap: 12px; }
		h1 { margin: 0 0 12px; font-size: 18px; font-weight: 600; }
		input, button { width: 100%; height: 44px; border: 1px solid #d4d4d4; border-radius: 8px; font: inherit; }
		input { padding: 0 12px; background: transparent; color: inherit; }
		button { border-color: #111; background: #111; color: #fff; cursor: pointer; }
		button:disabled { opacity: .5; cursor: not-allowed; }
		p { min-height: 20px; margin: 0; color: #b42318; font-size: 14px; }
		@media (prefers-color-scheme: dark) {
			body { background: #0a0a0a; color: #f5f5f5; }
			input { border-color: #404040; }
			button { border-color: #f5f5f5; background: #f5f5f5; color: #111; }
		}
	</style>
</head>
<body>
	<form action="/login" method="post">
		<h1>Maker</h1>
		<input type="password" name="password" aria-label="Password" placeholder="Password" autocomplete="current-password" autofocus required ${blocked ? 'disabled' : ''}>
		<button type="submit" ${blocked ? 'disabled' : ''}>Continue</button>
		<p role="alert">${message}</p>
	</form>
</body>
</html>`

const htmlResponse = (body: string, status = 200, headers?: HeadersInit): Response =>
	new Response(body, {
		headers: {
			'Cache-Control': 'no-store',
			'Content-Security-Policy':
				"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
			'Content-Type': 'text/html; charset=utf-8',
			'X-Content-Type-Options': 'nosniff',
			...headers
		},
		status
	})

export const createAuthHandler = ({ password, upstreamOrigin }: AuthOptions) => {
	const expectedPassword = digest(password)
	const sessionToken = digest(`session\0${password}`).toString('hex')
	const failures = new Map<string, Failure>()

	const clearExpiredFailures = (now: number): void => {
		for (const [ip, failure] of failures) {
			if (now - failure.startedAt >= FAILURE_WINDOW_MS) failures.delete(ip)
		}
	}

	const recordFailure = (ip: string, now: number): void => {
		clearExpiredFailures(now)
		const current = failures.get(ip)
		if (current) {
			current.count++
			return
		}
		if (failures.size >= MAX_FAILURE_ENTRIES) {
			const oldestIp = failures.keys().next().value
			if (oldestIp) failures.delete(oldestIp)
		}
		failures.set(ip, { count: 1, startedAt: now })
	}

	const hasSession = (request: Request): boolean => {
		const cookie = request.headers.get('cookie') ?? ''
		const value = cookie
			.split(';')
			.map(part => part.trim().split('='))
			.find(([name]) => name === COOKIE_NAME)?.[1]
		return value === sessionToken
	}

	const externalUrl = (request: Request, path: string): URL => {
		const incomingUrl = new URL(request.url)
		const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || incomingUrl.host
		const protocol =
			request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
			incomingUrl.protocol.slice(0, -1)
		return new URL(path, `${protocol}://${host}`)
	}

	const proxy = async (request: Request): Promise<Response> => {
		const incomingUrl = new URL(request.url)
		const upstreamUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, upstreamOrigin)
		const headers = new Headers(request.headers)
		headers.delete('host')
		headers.set('accept-encoding', 'identity')
		headers.set('x-forwarded-host', externalUrl(request, '/').host)
		headers.set('x-forwarded-proto', externalUrl(request, '/').protocol.slice(0, -1))

		const upstreamResponse = await fetch(upstreamUrl, {
			body: request.method === 'GET' || request.method === 'HEAD' ? null : request.body,
			headers,
			method: request.method,
			redirect: 'manual'
		})
		const responseHeaders = new Headers(upstreamResponse.headers)
		responseHeaders.set('X-Content-Type-Options', 'nosniff')
		return new Response(upstreamResponse.body, {
			headers: responseHeaders,
			status: upstreamResponse.status,
			statusText: upstreamResponse.statusText
		})
	}

	return async (request: Request): Promise<Response> => {
		const url = new URL(request.url)
		if (url.pathname === '/health') {
			return new Response('ok', { headers: { 'Cache-Control': 'no-store' } })
		}

		if (url.pathname === '/login' && request.method === 'GET') {
			if (hasSession(request)) return Response.redirect(externalUrl(request, '/'), 303)
			return htmlResponse(loginPage())
		}

		if (url.pathname === '/login' && request.method === 'POST') {
			const ip = request.headers.get('x-real-ip') ?? 'unknown'
			const now = Date.now()
			const form = await request.formData()
			const candidate = form.get('password')
			const matches =
				typeof candidate === 'string' && timingSafeEqual(digest(candidate), expectedPassword)

			if (matches) {
				failures.delete(ip)
				return new Response(null, {
					headers: {
						'Cache-Control': 'no-store',
						Location: '/',
						'Set-Cookie': `${COOKIE_NAME}=${sessionToken}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Strict`
					},
					status: 303
				})
			}

			const failure = failures.get(ip)
			if (failure && now - failure.startedAt < FAILURE_WINDOW_MS && failure.count >= FAILURE_LIMIT) {
				const retryAfter = Math.ceil((FAILURE_WINDOW_MS - (now - failure.startedAt)) / 1000)
				return htmlResponse(loginPage('Try again later.', true), 429, {
					'Retry-After': String(retryAfter)
				})
			}

			recordFailure(ip, now)
			return htmlResponse(loginPage('Wrong password.'), 401)
		}

		if (!hasSession(request)) return Response.redirect(externalUrl(request, '/login'), 303)
		return proxy(request)
	}
}

if (import.meta.main) {
	const password = process.env.APP_PASSWORD
	if (!password) throw new Error('APP_PASSWORD is required')
	const port = Number(process.env.AUTH_PORT ?? 8841)
	const upstreamOrigin = process.env.UPSTREAM_ORIGIN ?? 'http://127.0.0.1:8840'
	Bun.serve({
		fetch: createAuthHandler({ password, upstreamOrigin }),
		hostname: '127.0.0.1',
		port
	})
	console.log(`Maker auth listening on 127.0.0.1:${port}`)
}
