export function TagCloud({
  tags,
  className = "",
}: {
  tags: Array<{ label: string; value: string }>;
  className?: string;
}) {
  const sizes = ["text-sm", "text-base", "text-lg", "text-xl"];

  return (
    <div className={className}>
      <p className="text-xs font-semibold text-[#666] mb-3">运营标签</p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, i) => (
          <span
            key={tag.label}
            className={`inline-flex items-center gap-2 rounded-lg border border-[#e8e5dd] bg-white px-3 py-2 ${
              sizes[i % sizes.length]
            } font-semibold hover:border-[#f0a060] hover:bg-[#fff7ed] transition-colors`}
          >
            {tag.label}
            <span className="text-xs text-[#999]">{tag.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function InsightCardMatrix({
  items,
  className = "",
}: {
  items: Array<{ label: string; value: string }>;
  className?: string;
}) {
  return (
    <div className={`grid gap-2 md:grid-cols-2 ${className}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3"
        >
          <span className="text-[11px] font-semibold text-[#999] uppercase">
            {item.label}
          </span>
          <p className="mt-1 text-sm leading-5 font-medium">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
