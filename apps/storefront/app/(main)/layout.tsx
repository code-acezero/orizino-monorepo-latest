export const dynamic = "force-dynamic";
import MainShell from "./_main-shell";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <MainShell>{children}</MainShell>;
}
