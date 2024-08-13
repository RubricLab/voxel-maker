import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Button } from "./components/ui/button";
import { Switch } from "./components/ui/switch";

type Grid = boolean[];

const GridImageCreator: React.FC = () => {
  const [gridSize, setGridSize] = useState<number>(4);
  const [grid, setGrid] = useState<Grid>(Array(16).fill(false));
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [showBorders, setShowBorders] = useState<boolean>(true);
  const [drawMode, setDrawMode] = useState<boolean | null>(null);
  const lastToggledCellRef = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const size = Number(params.get("size")) || 3;
    const gridData = params.get("grid");
    setGridSize(size);
    if (gridData) {
      setGrid(gridData.split(",").map((cell) => cell === "1"));
    } else {
      setGrid(Array(size * size).fill(false));
    }
  }, []);

  const updateURL = useCallback((newSize: number, newGrid: Grid): void => {
    const params = new URLSearchParams();
    params.set("size", newSize.toString());
    params.set("grid", newGrid.map((cell) => (cell ? "1" : "0")).join(","));
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`
    );
  }, []);

  const handleSizeChange = (newSize: string): void => {
    const size = Number(newSize);
    const newGrid = Array(size * size).fill(false);
    setGridSize(size);
    setGrid(newGrid);
    updateURL(size, newGrid);
  };

  const handleCellChange = useCallback(
    (index: number): void => {
      if (lastToggledCellRef.current !== index) {
        setGrid((prevGrid) => {
          const newGrid = [...prevGrid];
          newGrid[index] = drawMode ?? !newGrid[index];
          updateURL(gridSize, newGrid);
          return newGrid;
        });
        lastToggledCellRef.current = index;
      }
    },
    [drawMode, gridSize, updateURL]
  );

  const handlePointerDown = (index: number) => {
    setIsDrawing(true);
    setDrawMode(grid[index] ? false : true);
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
    const cellSize = 100 / gridSize;
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

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${rects.join(
      ""
    )}</svg>`;
  };

  const copyAsSVG = () => {
    navigator.clipboard.writeText(generateOptimizedSVG());
  };

  const copyAsJSON = () => {
    const jsonData = JSON.stringify({ size: gridSize, grid });
    navigator.clipboard.writeText(jsonData);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="w-full">
        <Select onValueChange={handleSizeChange} value={gridSize.toString()}>
          <SelectTrigger>
            <SelectValue placeholder="Select grid size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3x3</SelectItem>
            <SelectItem value="4">4x4</SelectItem>
            <SelectItem value="6">6x6</SelectItem>
            <SelectItem value="9">9x9</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center mt-4 space-x-2">
          <Switch
            id="show-borders"
            checked={showBorders}
            onCheckedChange={setShowBorders}
          />
          <label htmlFor="show-borders">Show grid borders</label>
        </div>
      </div>
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
              className={`cursor-pointer ${
                showBorders ? "border border-neutral-300" : ""
              } ${cell ? "bg-white" : "bg-neutral-200"}`}
              onPointerDown={() => handlePointerDown(index)}
              onPointerMove={() => handlePointerMove(index)}
              onPointerUp={handlePointerUp}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Button onClick={copyAsSVG}>Copy as SVG</Button>
        <Button onClick={copyAsJSON}>Copy as JSON</Button>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="flex items-center justify-center min-h-screen min-w-screen">
      <GridImageCreator />
    </div>
  );
}

export default App;
