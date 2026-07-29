const toneStyles = {
  success: "bg-emerald-50 text-emerald-700",
  danger: "bg-rose-50 text-rose-700",
  warning: "bg-amber-50 text-amber-700",
  neutral: "bg-slate-100 text-slate-600",
  info: "bg-brand-50 text-brand-700"
};

export const Badge = ({ tone = "neutral", children }) => (
  <span className={`badge ${toneStyles[tone] || toneStyles.neutral}`}>{children}</span>
);
