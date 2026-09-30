import Mso from './Mso';

// Maps status to the tab filter key
export default function EmployeeCard({ emp }) {
  return (
    <div
      className="employee-card p-space-md rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low transition-all shadow-sm flex flex-col gap-space-xs"
      data-status={emp.status}
    >
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm">
          <img
            className="w-10 h-10 rounded-full object-cover shadow-sm"
            src={emp.photo}
            alt={emp.alt}
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-label-lg text-label-lg font-bold text-on-surface">{emp.name}</span>
              <span className="font-label-sm text-label-sm px-1.5 py-0.2 rounded bg-surface-container-high text-outline">
                {emp.empId}
              </span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {emp.role}
            </span>
          </div>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full ${emp.statusPill} font-label-sm text-label-sm font-bold uppercase tracking-wider flex items-center gap-1`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {emp.statusLabel}
        </span>
      </div>

      <div className="p-2 rounded-lg bg-surface-container-lowest/80 text-on-surface-variant font-body-sm text-body-sm flex items-center justify-between">
        <div className={`flex items-center gap-1.5 ${emp.iconColor || 'text-on-surface'} font-medium`}>
          {emp.icon && <Mso name={emp.icon} />}
          <span>{emp.note}</span>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          {emp.shift && <span className="text-outline text-[11px]">{emp.shift}</span>}
          {emp.duration && <span className="text-tertiary font-bold text-[11px]">{emp.duration}</span>}
          {emp.valid && <span className="text-outline text-[11px]">{emp.valid}</span>}
          {emp.time && <span className={`font-semibold ${emp.valueColor || 'text-secondary'}`}>{emp.time}</span>}
          {emp.tolerance && <span className="text-outline text-[11px]">{emp.tolerance}</span>}
          {emp.gps && (
            <span className="font-label-sm text-label-sm text-outline flex items-center gap-1">
              <Mso name="pin_drop" size={14} />
              {emp.gps}
            </span>
          )}
          {emp.verification && (
            <span className="font-body-sm text-body-sm text-outline flex items-center gap-1">
              <Mso name="check_circle" size={14} className="text-tertiary" />
              {emp.verification}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {emp.actions && (
        <div className="flex items-center justify-end gap-space-xs pt-1">
          {emp.actions.map((a, i) => (
            <button
              key={i}
              type="button"
              className={`px-space-sm py-1 rounded-md flex items-center gap-1 transition-colors font-label-sm text-label-sm ${a.pill}`}
            >
              <Mso name={a.icon} size={14} />
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
