export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <div className="mb-6 border-b border-border pb-4">
      {eyebrow && (
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-eyebrow text-primary">
          {eyebrow}
        </p>
      )}
      <h1 className="text-2xl font-black tracking-tight text-foreground">
        {title}
      </h1>
      {description && (
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
