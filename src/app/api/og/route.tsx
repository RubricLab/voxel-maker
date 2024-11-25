import { ImageResponse } from 'next/og'
import { RUBRIC_BINARY } from '~/lib/constants'

const size = { height: 400, width: 800 }

export const Component = ({ grid }: { grid?: string | undefined }) => {
	console.log({ gridBefore: grid })
	grid = grid || RUBRIC_BINARY
	console.log({ gridAfter: grid })

	const gridSize = Math.sqrt(grid.length)

	return (
		<div
			style={{
				background: 'black',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',
				alignItems: 'center',
				height: '100%',
				width: '100%',
				overflowY: 'hidden'
			}}
		>
			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					flexDirection: 'row',
					width: `${size.height}px`,
					height: `${size.height}px`,
					border: '1px solid white'
				}}
			>
				{grid
					.split('')
					.map(cell => Number(cell))
					.map((cell, index) => (
						<div
							key={index}
							style={{
								display: 'flex',
								background: cell ? 'white' : 'black',
								border: '1px solid white',
								height: `${100 / gridSize}%`,
								width: `${100 / gridSize}%`
							}}
						/>
					))}
			</div>
		</div>
	)
}

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url)
	console.log({ searchParams })

	const grid = searchParams.get('grid')

	return new ImageResponse(<Component grid={grid || ''} />, {
		...size,
		headers: {
			'Cache-Control': 'public, max-age=60'
		}
	})
}