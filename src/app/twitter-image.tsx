import OGImage, { type ImageProps } from './opengraph-image'

export const runtime = 'edge'
export { alt, contentType, size } from './opengraph-image'

const Response = async (props: ImageProps) => OGImage(props)

export default Response
