import OGImage, { type ImageProps } from './opengraph-image'

export const runtime = 'edge'
export { alt, contentType, size } from './opengraph-image'

export default async function Response({ params }: ImageProps) {
	console.log({ twParams: params })
	return OGImage({ params })
}
