export const dynamic = "force-dynamic";
import SectionShell from "@/components/admin/SectionShell";
export default function BackendSectionLayout({ children }: { children: React.ReactNode }) {
  return <SectionShell>{children}</SectionShell>;
}
