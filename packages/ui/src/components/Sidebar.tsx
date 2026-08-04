import { cn } from "../lib/utils.js";

export type SidebarIcon = React.ComponentType<{ className?: string }>;

export type SidebarNavItem = {
  href: string;
  label: string;
  icon?: SidebarIcon;
  active?: boolean;
};

export type SidebarNavSection = {
  heading?: string;
  items: SidebarNavItem[];
};

export type SidebarLinkComponent = React.ComponentType<{
  href: string;
  className?: string;
  children?: React.ReactNode;
}>;

export type SidebarProps = {
  brandMark?: React.ReactNode;
  brandName: string;
  sections: SidebarNavSection[];
  footer?: React.ReactNode;
  version?: string;
  /** Inject a framework-specific link (e.g. Next.js `Link`). Defaults to a plain `<a>`. */
  linkComponent?: SidebarLinkComponent;
  className?: string;
};

function DefaultLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export function Sidebar({
  brandMark,
  brandName,
  sections,
  footer,
  version,
  linkComponent,
  className,
}: SidebarProps) {
  const Link = linkComponent ?? DefaultLink;

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-border bg-sidebar",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-white">
          {brandMark}
        </span>
        <span className="text-sm font-semibold text-text">{brandName}</span>
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-2">
        {sections.map((section, sectionIndex) => (
          <div key={section.heading ?? sectionIndex} className={cn(sectionIndex > 0 && "mt-3", "flex flex-col gap-px")}>
            {section.heading ? (
              <p className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                {section.heading}
              </p>
            ) : null}
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                    item.active
                      ? "bg-primary/8 font-medium text-primary"
                      : "text-muted hover:bg-bg hover:text-text",
                  )}
                >
                  {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {footer || version ? (
        <div className="border-t border-border px-2 py-2">
          {footer}
          {version ? <p className="mt-1 px-2.5 text-xs text-muted">{version}</p> : null}
        </div>
      ) : null}
    </aside>
  );
}
