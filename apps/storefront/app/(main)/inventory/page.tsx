export const dynamic = "force-dynamic";
import React from "react";
import Page from "@/_pages/ShopPage";
export default function Route() {
  return (
    <React.Suspense fallback={null}>
      <Page />
    </React.Suspense>
  );
}
