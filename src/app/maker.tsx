'use client'

import { createParser, useQueryState } from 'nuqs'
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useDarkMode } from '~/hooks/useDarkMode'
import { RUBRIC_BINARY } from '~/lib/constants'

const GRID_RESOLUTION = 99
const GRID_VALUES = [0, 1] as const
const GRID_SIZES = [3, 5, 7, 9, 12, 15, 18, 21, 30]
const PNG_TARGET_SIZE = 400

const parseAsBooleanString = createParser({
	parse: (queryValue: string) => {
		const chars = queryValue.split('')
		const valid = chars.every(char => char in GRID_VALUES)
		if (!valid) return null
		return chars.map(char => Number(char))
	},
	serialize: value => value.join('')
})

type GridImageCreatorProps = {
	initialGrid?: string
}

export const GridImageCreator: FC<GridImageCreatorProps> = ({ initialGrid = RUBRIC_BINARY }) => {
	const [grid, setGrid] = useQueryState(
		'grid',
		parseAsBooleanString.withDefault(initialGrid.split('').map(char => Number(char)))
	)
	const [transparentBackground, setTransparentBackground] = useState(true)

	const darkMode = useDarkMode()
	const gridSize = useMemo(() => Math.sqrt(grid.length), [grid])
	const smallerGridSize = [...GRID_SIZES].reverse().find(size => size < gridSize)
	const largerGridSize = GRID_SIZES.find(size => size > gridSize)
	const isDrawingRef = useRef(false)
	const drawValueRef = useRef(1)
	const lastPaintedCellRef = useRef<number | null>(null)
	const faviconRef = useRef<HTMLLinkElement | null>(null)

	const handleSizeChange = (newSize: number | undefined): void => {
		if (!newSize) return
		setGrid(Array(newSize ** 2).fill(0))
	}

	const paintCell = useCallback(
		(index: number, value: number): void => {
			if (lastPaintedCellRef.current === index) return

			setGrid(previousGrid => {
				if (previousGrid[index] === value) return previousGrid
				const nextGrid = [...previousGrid]
				nextGrid[index] = value
				return nextGrid
			})
			lastPaintedCellRef.current = index
		},
		[setGrid]
	)

	const handlePointerDown = (index: number): void => {
		const nextValue = grid[index] ? 0 : 1
		isDrawingRef.current = true
		drawValueRef.current = nextValue
		paintCell(index, nextValue)
	}

	const handlePointerMove = (index: number): void => {
		if (isDrawingRef.current) paintCell(index, drawValueRef.current)
	}

	const stopDrawing = useCallback((): void => {
		isDrawingRef.current = false
		lastPaintedCellRef.current = null
	}, [])

	useEffect(() => {
		window.addEventListener('pointerup', stopDrawing)
		window.addEventListener('pointercancel', stopDrawing)
		return () => {
			window.removeEventListener('pointerup', stopDrawing)
			window.removeEventListener('pointercancel', stopDrawing)
		}
	}, [stopDrawing])

	const generateSVG = useCallback(
		(includeBackground = false) => {
			const cellSize = GRID_RESOLUTION / gridSize
			const foreground = darkMode ? 'white' : 'black'
			const background = darkMode ? 'black' : 'white'
			const rects: string[] = []

			for (let y = 0; y < gridSize; y++) {
				let startX: number | null = null
				let width = 0

				for (let x = 0; x <= gridSize; x++) {
					const index = y * gridSize + x
					const cell = x < gridSize ? grid[index] : false

					if (cell && startX === null) {
						startX = x
						width = 1
					} else if (cell) {
						width++
					}

					if ((!cell || x === gridSize) && startX !== null) {
						rects.push(
							`<rect x="${startX * cellSize}" y="${y * cellSize}" width="${
								width * cellSize
							}" height="${cellSize}" fill="${foreground}" />`
						)
						startX = null
						width = 0
					}
				}
			}

			const backgroundRect = includeBackground
				? `<rect width="${GRID_RESOLUTION}" height="${GRID_RESOLUTION}" fill="${background}" />`
				: ''

			return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID_RESOLUTION} ${GRID_RESOLUTION}" shape-rendering="crispEdges">${backgroundRect}${rects.join('')}</svg>`
		},
		[darkMode, grid, gridSize]
	)

	useEffect(() => {
		const existingIcon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
		const icon = existingIcon ?? document.createElement('link')
		const previousHref = icon.getAttribute('href')

		if (!existingIcon) {
			icon.rel = 'icon'
			icon.type = 'image/svg+xml'
			document.head.appendChild(icon)
		}
		faviconRef.current = icon

		return () => {
			faviconRef.current = null
			if (!existingIcon) icon.remove()
			else if (previousHref) icon.href = previousHref
			else icon.removeAttribute('href')
		}
	}, [])

	useEffect(() => {
		if (!faviconRef.current) return
		faviconRef.current.href = `data:image/svg+xml,${encodeURIComponent(generateSVG(true))}`
	}, [generateSVG])

	const copyAsSVG = async (): Promise<void> => {
		try {
			await navigator.clipboard.writeText(generateSVG())
			toast.success('SVG copied')
		} catch (error) {
			console.error({ error })
			toast.error('Failed to copy SVG')
		}
	}

	const gridToPngBlob = useCallback(async (): Promise<Blob> => {
		const cellSize = Math.max(1, Math.round(PNG_TARGET_SIZE / gridSize))
		const imageSize = gridSize * cellSize
		const canvas = document.createElement('canvas')
		canvas.width = imageSize
		canvas.height = imageSize
		const context = canvas.getContext('2d')
		if (!context) throw new Error('Failed to get canvas context')

		context.imageSmoothingEnabled = false
		const foreground = darkMode ? '#ffffff' : '#000000'
		const background = darkMode ? '#000000' : '#ffffff'

		if (!transparentBackground) {
			context.fillStyle = background
			context.fillRect(0, 0, imageSize, imageSize)
		}

		context.fillStyle = foreground
		for (let y = 0; y < gridSize; y++) {
			for (let x = 0; x < gridSize; x++) {
				const index = y * gridSize + x
				if (grid[index]) {
					context.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
				}
			}
		}

		return new Promise((resolve, reject) => {
			canvas.toBlob(blob => {
				if (blob) resolve(blob)
				else reject(new Error('Failed to create PNG blob'))
			}, 'image/png')
		})
	}, [darkMode, grid, gridSize, transparentBackground])

	const copyAsPNG = useCallback(async (): Promise<void> => {
		try {
			const blob = await gridToPngBlob()
			await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
			toast.success('PNG copied')
		} catch (error) {
			console.error({ error })
			toast.error('Failed to copy PNG')
		}
	}, [gridToPngBlob])

	const downloadAsPNG = useCallback(async (): Promise<void> => {
		try {
			const blob = await gridToPngBlob()
			const url = URL.createObjectURL(blob)
			const link = document.createElement('a')
			link.href = url
			link.download = `grid-${gridSize}x${gridSize}.png`
			document.body.appendChild(link)
			link.click()
			link.remove()
			URL.revokeObjectURL(url)
			toast.success('PNG downloaded')
		} catch (error) {
			console.error({ error })
			toast.error('Failed to download PNG')
		}
	}, [gridSize, gridToPngBlob])

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent): void => {
			if (!(event.metaKey || event.ctrlKey)) return

			const key = event.key.toLowerCase()
			if (key === 's') {
				event.preventDefault()
				void downloadAsPNG()
				return
			}

			if (key !== 'c') return
			const target = event.target as HTMLElement | null
			if (target && /^(input|textarea|select)$/i.test(target.tagName)) return
			event.preventDefault()
			void copyAsPNG()
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [copyAsPNG, downloadAsPNG])

	const clearGrid = (): void => {
		setGrid(Array(gridSize ** 2).fill(0))
	}

	return (
		<main className="maker">
			<div className="editor">
				<div className="pixel-grid" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
					{grid.map((cell, index) => (
						<button
							key={index}
							className="pixel-cell"
							data-active={cell === 1}
							type="button"
							aria-label={`${cell ? 'Erase' : 'Fill'} row ${Math.floor(index / gridSize) + 1}, column ${(index % gridSize) + 1}`}
							aria-pressed={cell === 1}
							onClick={event => {
								if (event.detail !== 0) return
								lastPaintedCellRef.current = null
								paintCell(index, cell ? 0 : 1)
								lastPaintedCellRef.current = null
							}}
							onPointerDown={event => {
								if (event.button !== 0) return
								event.preventDefault()
								handlePointerDown(index)
							}}
							onPointerEnter={() => handlePointerMove(index)}
						/>
					))}
				</div>

				<div className="editor-meta">
					<span>Click and drag to paint. Start on a filled pixel to erase.</span>
					<button className="clear-button" type="button" onClick={clearGrid}>
						Clear
					</button>
				</div>
			</div>

			<section className="size-section" aria-labelledby="size-title">
				<h2 id="size-title" className="section-label">
					Grid size
				</h2>
				<div className="size-stepper">
					<button
						className="size-button size-decrease"
						type="button"
						onClick={() => handleSizeChange(smallerGridSize)}
						disabled={!smallerGridSize}
						aria-label="Make grid smaller"
					>
						<span aria-hidden="true">−</span>
					</button>
					<output className="size-value" aria-live="polite">
						{gridSize}
						<span>×</span>
						{gridSize}
					</output>
					<button
						className="size-button size-increase"
						type="button"
						onClick={() => handleSizeChange(largerGridSize)}
						disabled={!largerGridSize}
						aria-label="Make grid larger"
					>
						<span aria-hidden="true">+</span>
					</button>
				</div>
			</section>

			<section className="export-section" aria-labelledby="export-title">
				<div className="export-heading">
					<h2 id="export-title" className="section-label">
						Export
					</h2>
					<label className="transparent-toggle" htmlFor="transparent-background">
						<input
							id="transparent-background"
							type="checkbox"
							checked={transparentBackground}
							onChange={event => setTransparentBackground(event.target.checked)}
						/>
						<span>Transparent background</span>
					</label>
				</div>

				<div className="export-actions">
					<button className="action-button primary-action" type="button" onClick={copyAsPNG}>
						<span>Copy PNG</span>
						<kbd>⌘C</kbd>
					</button>
					<button className="action-button primary-action" type="button" onClick={downloadAsPNG}>
						<span>Download</span>
						<kbd>⌘S</kbd>
					</button>
					<button className="action-button secondary-action" type="button" onClick={copyAsSVG}>
						Copy SVG
					</button>
				</div>
			</section>
		</main>
	)
}
