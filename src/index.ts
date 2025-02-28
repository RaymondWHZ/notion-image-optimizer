/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const getKeyFromNotionImageUrl = (url: string) => new URL(url).pathname.slice(1)

export default {
	async fetch(request, env): Promise<Response> {
		// Parse request URL to get access to query string
		let url = new URL(request.url)

		if (request.method === 'PUT') {
			if (url.pathname !== '/') {
				return new Response('Not found', { status: 404 })
			}

			const { notionImageUrls } = await request.json<{ notionImageUrls: string[] }>()
			const newKeySet = new Set(notionImageUrls.map(getKeyFromNotionImageUrl))

			const { objects } = await env.CACHED_NOTION_IMAGES_BUCKET.list()
			const currentKeys = objects.map(_ => _.key)
			const keysToDelete = currentKeys.filter(_ => !newKeySet.has(_))
			const keysToCreate = notionImageUrls.filter(_ => !currentKeys.includes(_))

			await Promise.all([
				keysToDelete.length > 0 ? env.CACHED_NOTION_IMAGES_BUCKET.delete(keysToDelete) : Promise.resolve(),
				...keysToCreate.map(async url => {
					const key = getKeyFromNotionImageUrl(url)
					await env.CACHED_NOTION_IMAGES_BUCKET.put(key, null, {
						customMetadata: { url }
					})
				})
			])

			return new Response('OK')
		} else if (request.method === 'GET') {
			// Get cache
			const cache = caches.default

			// Get object key
			const key = url.pathname.slice(1)

			// Check if object is in cache
			const cachedResponse = await cache.match(key)
			if (cachedResponse) {
				return cachedResponse
			}

			// Get object from R2 bucket
			const object = await env.CACHED_NOTION_IMAGES_BUCKET.get(key)
			if (!object) {
				return new Response('Not found', { status: 404 })
			}

			// Test if object is a redirect
			let body: BodyInit = object.body;
			if (object.customMetadata?.url) {
				const res = await fetch(object.customMetadata.url)
				body = await res.blob()
				await env.CACHED_NOTION_IMAGES_BUCKET.put(key, body)
			}

			// Create response
			const response = new Response(body, {
				headers: {
					'Cache-Control': 'private,max-age=86340,immutable,must-revalidate'
				}
			})

			// Cache object
			await cache.put(key, response.clone())

			return response
		} else {
			return new Response('Method not allowed', { status: 405 })
		}
	},
} satisfies ExportedHandler<Env>;
