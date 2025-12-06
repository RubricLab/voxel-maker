import { Container } from '@rubriclab/ui'
import type { Metadata } from 'next/types'
import { Suspense } from 'react'
import { RUBRIC_BINARY } from '~/lib/constants'
import { GridImageCreator } from './maker'

type Props = { searchParams: Promise<{ grid?: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
	const searchParams = await props.searchParams
	const { grid = RUBRIC_BINARY } = searchParams

	const title = 'Maker by Rubric'

	return {
		openGraph: {
			images: [`/api/og?grid=${encodeURIComponent(grid)}`],
			title
		},
		title,
		twitter: {
			card: 'summary_large_image',
			images: [`/api/og?grid=${encodeURIComponent(grid)}`],
			title
		}
	}
}

export default function Page(_props: Props) {
	return (
		<div className="flex h-screen w-screen items-center justify-center">
			<Suspense fallback={<div>Loading...</div>}>
				<Container>
					<GridImageCreator />
				</Container>
			</Suspense>
		</div>
	)
}
