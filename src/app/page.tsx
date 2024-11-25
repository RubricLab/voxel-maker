import React, { Suspense } from 'react'
import { GridImageCreator } from './maker'
import { Layout } from '~/lib/ui'

export default function Page() {
	return (
		<div className="flex h-screen w-screen items-center justify-center">
			<Suspense fallback={<div>Loading...</div>}>
				<Layout page={<GridImageCreator />} />
			</Suspense>
		</div>
	)
}
