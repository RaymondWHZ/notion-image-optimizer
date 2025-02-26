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

export default {
	async fetch(request): Promise<Response> {
		// Parse request URL to get access to query string
		let url = new URL(request.url)

		// Get width query parameters
		let width = url.searchParams.has("width") ? parseInt(url.searchParams.get("width")!) : undefined
	
		// Get URL of the original (full size) image to resize.
		// You could adjust the URL here, e.g., prefix it with a fixed address of your server,
		// so that user-visible URLs are shorter and cleaner.
		const encodedImageURL = url.searchParams.get("image")
		if (!encodedImageURL) return new Response('Missing "image" value', { status: 400 })
		const imageURL = decodeURI(encodedImageURL)
	
		try {
		  const { hostname, pathname } = new URL(imageURL)

		  // Demo: Only accept "example.com" images
		  if (hostname !== 'prod-files-secure.s3.us-west-2.amazonaws.com') {
			return new Response('Must use "prod-files-secure.s3.us-west-2.amazonaws.com" source images', { status: 403 })
		  }
		} catch (err) {
		  return new Response('Invalid "image" value', { status: 400 })
		}
	
		// Build a request that passes through request headers
		const imageRequest = new Request(imageURL)
	
		// Returning fetch() with resizing options will pass through response with the resized image.
		return fetch(imageRequest, {
			cf: {
				cacheKey: imageURL.split('?')[0],  // Cache key should be the same for the same image
				image: { width }
			}
		})
	},
} satisfies ExportedHandler<Env>;
