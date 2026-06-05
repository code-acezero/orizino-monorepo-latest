export const dynamic = "force-dynamic";
import MainShell from "./(main)/_main-shell";
import Page from "@/_pages/HomePage";
export default function RootPage() {
  return (
    <MainShell>
      <Page />
    </MainShell>
  );
}
