'use client';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <>
      <header className="flex items-center justify-between p-4 border-b bg-card">
        <h1 className="text-2xl font-bold font-headline">{title}</h1>
        <div className="flex items-center gap-2">
          {children}
        </div>
      </header>
    </>
  );
}
