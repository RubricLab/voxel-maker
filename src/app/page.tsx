import React, { Suspense } from "react";
import { GridImageCreator } from "./maker";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GridImageCreator />
    </Suspense>
  );
}
