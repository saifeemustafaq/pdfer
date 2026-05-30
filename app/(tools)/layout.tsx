import { TopNav } from "@/components/top-nav";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav />
      <main className="flex-1 flex flex-col pt-12 md:pt-14 pb-16 md:pb-0">
        {children}
      </main>
    </>
  );
}
