import { ImageResponse } from 'next/og'
import { RUBRIC_BINARY } from '~/lib/constants'

const size = { height: 400, width: 800 }

const Component = ({ grid }: { grid: string }) => {
	const gridSize = Math.sqrt(grid.length)

	return (
		<div
			style={{
				alignItems: 'center',
				background: 'black',
				display: 'flex',
				flexDirection: 'column',
				height: '100%',
				justifyContent: 'center',
				overflowY: 'hidden',
				width: '100%'
			}}
		>
			<div
				style={{
					border: '1px solid white',
					display: 'flex',
					flexDirection: 'row',
					flexWrap: 'wrap',
					height: `${size.height}px`,
					width: `${size.height}px`
				}}
			>
				{grid
					.split('')
					.map(cell => Number(cell))
					.map((cell, index) => (
						<div
							key={index}
							style={{
								background: cell ? 'white' : 'black',
								border: '1px solid white',
								display: 'flex',
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
	const grid = searchParams.get('grid') || RUBRIC_BINARY

	return new ImageResponse(<Component grid={grid} />, size)
}
