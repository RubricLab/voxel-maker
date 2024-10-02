"use client";

import { parseAsBoolean, useQueryState, createParser } from "nuqs";
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type FC,
  useMemo,
} from "react";
import { Button, Input, Stack, Switch } from "rubricui";
import { toast } from "sonner";
import { useDarkMode } from "~/hooks/useDarkMode";
import { cn } from "~/lib/utils";

const GRID_RESOLUTION = 99;
const GRID_VALUES = [0, 1] as const;

const parseAsBooleanString = createParser({
  parse(queryValue: string) {
    const chars = queryValue.split("");
    const valid = chars.every((char) => char in GRID_VALUES);
    if (!valid) return null;
    return chars.map((char) => Number(char));
  },
  serialize(value) {
    return value.join("");
  },
});

export const GridImageCreator: FC = () => {
  const [showBorders, setShowBorders] = useQueryState(
    "borders",
    parseAsBoolean.withDefault(true)
  );

  const [grid, setGrid] = useQueryState(
    "grid",
    parseAsBooleanString.withDefault(
      "101110100".split("").map((c) => Number(c))
    )
  );

  const gridSize = useMemo(() => Math.sqrt(grid?.length), [grid]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<boolean | null>(null);

  const darkMode = useDarkMode();

  const lastToggledCellRef = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleSizeChange = (newSize: string): void => {
    if (!newSize || Number.isNaN(Number(newSize))) return;
    const newGrid = Array(Number(newSize) ** 2).fill(0);
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

  const generateSVG = useCallback(() => {
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
            }" height="${cellSize}" fill="${darkMode ? "white" : "black"}" />`
          );
          startX = null;
          width = 0;
        }
      }
    }

    const rectStr = rects.join("");

    return `<svg xmlns="https://www.w3.org/2000/svg" viewBox="0 0 ${GRID_RESOLUTION} ${GRID_RESOLUTION}">${rectStr}</svg>`;
  }, [gridSize, grid, darkMode]);

  const copyAsSVG = () => {
    navigator.clipboard.writeText(generateSVG());
    toast.success("SVG copied to clipboard");
  };

  const copyAsJSON = () => {
    const jsonData = JSON.stringify({ size: gridSize, grid });
    navigator.clipboard.writeText(jsonData);
    toast.success("JSON copied to clipboard");
  };

  const clearGrid = () => {
    setGrid(Array(gridSize * gridSize).fill(0));
    toast.success("Grid cleared");
  };

  return (
    <Stack gap={4}>
      <Stack gap={2} direction="horizontal" className="w-full">
        <label htmlFor="grid-size">Grid size</label>
        <Input
          type="number"
          className="border w-1/2 dark:border-white text-black dark:text-white border-black"
          id="grid-size"
          value={Math.sqrt(grid.length)}
          onChange={(e) => {
            const val = e.target.value;
            handleSizeChange(val);
          }}
        />
      </Stack>
      <Stack gap={2} direction="horizontal">
        <Switch
          id="show-borders"
          className="border dark:border-white"
          checked={showBorders}
          onCheckedChange={setShowBorders}
        />
        <label htmlFor="show-borders">Show grid borders</label>
      </Stack>
      <Stack className="w-full md:w-[400px]">
        <div
          ref={gridRef}
          className={cn("grid", {
            "border border-black dark:border-white": showBorders,
          })}
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            aspectRatio: "1 / 1",
          }}
        >
          {grid.map((cell, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
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
      </Stack>
      <Stack direction="horizontal" gap={1}>
        <Button onClick={copyAsSVG}>Copy as SVG</Button>
        <Button onClick={copyAsJSON}>Copy as JSON</Button>
        <Button onClick={clearGrid}>Clear</Button>
      </Stack>
    </Stack>
  );
};
