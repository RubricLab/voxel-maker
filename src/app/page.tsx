import React, { Suspense } from "react";
import { GridImageCreator } from "./maker";

export default function Page() {
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <Suspense fallback={<div>Loading...</div>}>
        <GridImageCreator />
      </Suspense>
    </div>
  );
}
