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

import sharp from "sharp";

export default {
	async fetch(request, env): Promise<Response> {
		// Parse request URL to get access to query string
		let url = new URL(request.url)

		if (request.method === 'PUT') {
			// TODO update existing cache
			return new Response('Not implemented', { status: 501 })
		} else if (request.method === 'GET') {
			// Get object key
			const key = url.pathname

			// Get width query parameters
			let width: number | undefined = parseInt(url.searchParams.get("width") ?? "")
			if (isNaN(width)) {
				width = undefined
			}

			// Get object from cache
			const object = await env.CACHED_NOTION_IMAGES_BUCKET.get(key)
			if (!object) {
				return new Response('Not found', { status: 404 })
			}

			// Get image URL
			let result: BodyInit = object.body
			if (width) {
				result = await sharp(await object.arrayBuffer())
					.resize(width)
					.toFormat('avif', {
						quality: 100,
						lossless: true,
					})
					.toBuffer()
			}

			// Return response
			return new Response(result, {
				headers: {
					'Content-Type': 'image/avif',
				},
			})
		} else {
			return new Response('Method not allowed', { status: 405 })
		}
	},
} satisfies ExportedHandler<Env>;
