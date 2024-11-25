import React, { Suspense } from 'react'
import { GridImageCreator } from './maker'
import { Layout } from '~/lib/ui'
import type { Metadata } from 'next/types'
import { RUBRIC_BINARY } from '~/lib/constants'

type Props = { searchParams: Promise<{ grid?: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
	const searchParams = await props.searchParams
	const { grid = RUBRIC_BINARY } = searchParams

	console.log({ grid })

	const title = 'Maker by Rubric'

	return {
		title,
		openGraph: {
			title,
			images: [
				{
					url: `/api/og?grid=${encodeURIComponent(grid)}`,
					width: 1200,
					height: 600
				}
			]
		},
		twitter: {
			card: 'summary_large_image',
			title,
			images: [`/api/og?grid=${encodeURIComponent(grid)}`]
		}
	}
}

export default function Page(_props: Props) {
	return (
		<div className="flex h-screen w-screen items-center justify-center">
			<Suspense fallback={<div>Loading...</div>}>
				<Layout page={<GridImageCreator />} />
			</Suspense>
		</div>
	)
}
