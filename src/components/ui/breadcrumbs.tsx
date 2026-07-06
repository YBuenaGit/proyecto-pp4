import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items.length) return null;

  return (
    <nav aria-label="breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center rounded-sm border border-[#dee2e6] bg-[#e9ecef] px-3 py-2 text-xs text-[#212529]">
        {items.map((item, index) => {
          const current = index === items.length - 1 || !item.href;
          const href = item.href;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center">
              {index > 0 ? <span className="mx-2 text-[#adb5bd]">/</span> : null}
              {current || !href ? (
                <span aria-current="page" className="font-semibold text-[#495057]">
                  {item.label}
                </span>
              ) : (
                <Link href={href} className="font-semibold text-[#0667b0] hover:text-[#0a61b9] hover:underline">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
