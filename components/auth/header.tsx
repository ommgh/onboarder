interface HeaderProps {
  label: string;
  description?: string;
}

export const Header = ({ label, description }: HeaderProps) => (
  <div className="w-full space-y-1.5">
    <h1 className="text-3xl font-semibold">{label}</h1>
    {description ? (
      <p className="text-sm text-muted-foreground">{description}</p>
    ) : null}
  </div>
);
