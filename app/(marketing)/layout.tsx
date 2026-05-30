import { ThemeToggle } from "@/components/theme-toggle";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="hidden md:block fixed top-3 right-3 z-[100]">
        <ThemeToggle />
      </div>
      {children}
    </>
  );
}
