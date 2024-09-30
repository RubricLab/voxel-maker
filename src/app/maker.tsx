"use client";
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  useQueryState,
} from "nuqs";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Switch,
} from "rubricui";
import { cn } from "~/lib/utils";

type Grid = Array<1 | 0>;

const GRID_RESOLUTION = 99;
const GRID_SIZES = [3, 4, 5, 6, 9] as const;

export const GridImageCreator: React.FC = () => {
  const [gridSize, setGridSize] = useQueryState<number>(
    "size",
    parseAsInteger.withDefault(GRID_SIZES[0])
  );

  const [showBorders, setShowBorders] = useQueryState(
    "borders",
    parseAsBoolean.withDefault(true)
  );

  const [grid, setGrid] = useQueryState(
    "grid",
    parseAsArrayOf(parseAsInteger).withDefault(
      Array(GRID_SIZES[0] ** 2).fill(0)
    )
  );

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<boolean | null>(null);

  const lastToggledCellRef = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const updateURL = useCallback((newGrid: Grid): void => {
    setGrid(newGrid);
  }, []);

  const handleSizeChange = (newSize: string): void => {
    const size = Number(newSize);
    const newGrid = Array(size * size).fill(0);
    setGridSize(size);
    setGrid(newGrid);
  };

  const handleCellChange = useCallback(
    (index: number): void => {
      if (lastToggledCellRef.current !== index) {
        setGrid((prevGrid) => {
          const newGrid = [...prevGrid];
          newGrid[index] = drawMode
            ? Number(drawMode)
            : Number(!newGrid[index]);
          return newGrid;
        });
        lastToggledCellRef.current = index;
      }
    },
    [drawMode, setGrid]
  );

  const handlePointerDown = (index: number) => {
    setIsDrawing(true);
    setDrawMode(true);
    handleCellChange(index);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    setDrawMode(null);
    lastToggledCellRef.current = null;
  };

  const handlePointerMove = (index: number) => {
    if (isDrawing) {
      handleCellChange(index);
    }
  };

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      setIsDrawing(false);
      setDrawMode(null);
      lastToggledCellRef.current = null;
    };
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
  }, []);

  const generateOptimizedSVG = () => {
    const cellSize = GRID_RESOLUTION / gridSize;
    const rects: string[] = [];

    for (let y = 0; y < gridSize; y++) {
      let startX: number | null = null;
      let width = 0;

      for (let x = 0; x <= gridSize; x++) {
        const index = y * gridSize + x;
        const cell = x < gridSize ? grid[index] : false;

        if (cell && startX === null) {
          startX = x;
          width = 1;
        } else if (cell) {
          width++;
        }

        if ((!cell || x === gridSize) && startX !== null) {
          rects.push(
            `<rect x="${startX * cellSize}" y="${y * cellSize}" width="${
              width * cellSize
            }" height="${cellSize}" fill="white" />`
          );
          startX = null;
          width = 0;
        }
      }
    }

    const rectStr = rects.join("");

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID_RESOLUTION} ${GRID_RESOLUTION}">${rectStr}</svg>`;
  };

  const copyAsSVG = () => {
    navigator.clipboard.writeText(generateOptimizedSVG());
  };

  const copyAsJSON = () => {
    const jsonData = JSON.stringify({ size: gridSize, grid });
    navigator.clipboard.writeText(jsonData);
  };

  const clearGrid = () => {
    setGrid(Array(gridSize * gridSize).fill(false));
    updateURL(Array(gridSize * gridSize).fill(false));
  };

  return (
    <Stack gap={4}>
      <Stack>
        <Select onValueChange={handleSizeChange} value={gridSize.toString()}>
          <SelectTrigger key="trigger" className="dark:bg-white">
            <SelectValue
              className="dark:text-white"
              key="size"
              placeholder="Select grid size"
            />
          </SelectTrigger>
          <SelectContent>
            {GRID_SIZES.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}x{size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2">
          <Switch
            id="show-borders"
            checked={showBorders}
            onCheckedChange={setShowBorders}
          />
          <label htmlFor="show-borders">Show grid borders</label>
        </div>
      </Stack>
      <div className="w-full md:w-[300px]">
        <div
          ref={gridRef}
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            aspectRatio: "1 / 1",
          }}
        >
          {grid.map((cell, index) => (
            <div
              key={index}
              className={cn(
                "cursor-pointer",
                cell ? "dark:bg-white bg-black" : "dark:bg-black bg-white",
                {
                  "border border-black dark:border-white": showBorders,
                }
              )}
              onPointerDown={() => handlePointerDown(index)}
              onPointerMove={() => handlePointerMove(index)}
              onPointerUp={handlePointerUp}
            />
          ))}
        </div>
      </div>
      <Stack direction="horizontal" gap={1}>
        <Button onClick={copyAsSVG}>Copy as SVG</Button>
        <Button onClick={copyAsJSON}>Copy as JSON</Button>
        <Button onClick={clearGrid}>Clear</Button>
      </Stack>
    </Stack>
  );
};
