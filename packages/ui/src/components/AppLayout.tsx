import { cn } from "../lib/utils.js";

export type AppLayoutProps = {
  /** Typically a `<Sidebar />` from this package. */
  sidebar: React.ReactNode;
  /** Full-width banner rendered above the page content, e.g. `<ImpersonationBar />`. */
  banner?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function AppLayout({ sidebar, banner, children, className }: AppLayoutProps) {
  return (
    <div className={cn("flex min-h-screen bg-bg", className)}>
      {sidebar}
      <main className="flex-1 overflow-auto">
        {banner}
        <div className="w-full px-5 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
