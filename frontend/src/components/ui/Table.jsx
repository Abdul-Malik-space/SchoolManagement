export const Table = ({ columns, children }) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70">
            {columns.map((column) => (
              <th
                key={column}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
};

export const Td = ({ children, className = "" }) => (
  <td className={`px-4 py-3.5 text-slate-700 ${className}`}>{children}</td>
);

export const EmptyState = ({ colSpan, icon: Icon, title, description }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-16 text-center">
      <div className="flex flex-col items-center gap-2">
        {Icon && <Icon size={28} className="text-slate-300" strokeWidth={1.5} />}
        <p className="text-sm font-medium text-slate-600">{title}</p>
        {description && <p className="text-xs text-slate-400">{description}</p>}
      </div>
    </td>
  </tr>
);
