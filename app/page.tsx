const stats = [
  { label: "Total Users", value: "128", tone: "text-brand-blue" },
  { label: "Present Today", value: "96", tone: "text-brand-green" },
  { label: "Late Entries", value: "07", tone: "text-brand-pink" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="rounded-lg border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-sky">Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground">
              Attendance Overview
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Monitor daily attendance, registered users, and exception cases from one focused
            admin workspace.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <p className={`mt-3 text-4xl font-bold ${stat.tone}`}>{stat.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-bold text-foreground">Quick Status</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-border bg-secondary p-4 text-secondary-foreground">
            <p className="text-sm font-semibold">Backend API</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Client configured through NEXT_PUBLIC_API_BASE_URL.
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted p-4">
            <p className="text-sm font-semibold text-foreground">Theme</p>
            <p className="mt-1 text-sm text-muted-foreground">
              NIELIT colors are available through Tailwind theme tokens.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
