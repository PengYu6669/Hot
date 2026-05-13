"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "工作台" },
  { href: "/events", label: "事件详情" },
  { href: "/workflow", label: "Agent 编排" },
];

export function AppShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[#f4f3ef] text-[#111111]">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-3 md:gap-4 px-3 py-3 md:px-6 md:py-4">
        <header className="rounded-lg border border-[#dcd8cf] bg-white p-3 md:p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-normal text-[#707070]">
                {eyebrow}
              </p>
              <h1 className="mt-1 text-xl md:text-3xl lg:text-4xl font-semibold leading-tight tracking-normal">
                {title}
              </h1>
              {description ? (
                <p className="mt-1 md:mt-2 max-w-4xl text-xs md:text-sm lg:text-base leading-5 md:leading-6 text-[#444444] line-clamp-2 md:line-clamp-none">
                  {description}
                </p>
              ) : null}
            </div>
            <nav className="flex shrink-0 flex-wrap gap-1.5 md:gap-2">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    className={`rounded-lg border px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-semibold transition-colors ${
                      active
                        ? "border-[#f0a060] bg-[#fff7ed] text-[#e8752a]"
                        : "border-[#dcd8cf] bg-white hover:border-[#111]"
                    }`}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}

export function Panel({
  eyebrow,
  title,
  children,
  className = "",
}: {
  eyebrow?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-[#e8e6df] bg-white/90 p-4 md:p-5 shadow-sm ${className}`}
    >
      {eyebrow ? (
        <p className="text-[10px] md:text-xs font-bold uppercase tracking-normal text-[#707070]">
          {eyebrow}
        </p>
      ) : null}
      {title ? (
        <h2 className="mt-1 md:mt-2 text-lg md:text-2xl font-semibold">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}
