import '../index.css'
import { NuqsAdapter } from 'nuqs/adapters/react'
import { Toaster } from 'sonner'

export const metadata = {
	description: 'Draw NxN pixel graphics.',
	title: 'Maker'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<NuqsAdapter>
				<body>{children}</body>
				<Toaster />
			</NuqsAdapter>
		</html>
	)
}
