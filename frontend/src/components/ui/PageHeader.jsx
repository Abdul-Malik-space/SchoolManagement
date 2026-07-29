export const PageHeader = ({ title, action }) => (
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
    {action}
  </div>
);
