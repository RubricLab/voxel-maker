import '../index.css'
import { Toaster } from 'sonner'
import { NuqsAdapter } from 'nuqs/adapters/react'

export const metadata = {
	title: 'Maker',
	description: 'Draw NxN pixel graphics.'
}

export default function RootLayout({
	children
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en">
			<NuqsAdapter>
				<body>{children}</body>
				<Toaster />
			</NuqsAdapter>
		</html>
	)
}
