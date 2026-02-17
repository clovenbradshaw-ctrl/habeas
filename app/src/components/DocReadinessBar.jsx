export default function DocReadinessBar({ ready, total }) {
  const pct = total > 0 ? (ready / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-500">Documents</span>
        <span className="text-xs font-bold text-gray-600">{ready}/{total} ready</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
