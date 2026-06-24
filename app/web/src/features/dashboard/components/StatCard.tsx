interface StatCardProps {
  label: string;
  value: string;
  description: string;
}

export function StatCard({ label, value, description }: StatCardProps) {
  return (
    <div className="rounded border border-nav-border bg-surface p-lg shadow-sm">
      <p className="font-sans text-caption text-helper-text uppercase tracking-chip mb-xs">
        {label}
      </p>
      <p className="font-heading text-h2 text-navy mb-xs">{value}</p>
      <p className="font-sans text-body-sm text-helper-text">{description}</p>
    </div>
  );
}
