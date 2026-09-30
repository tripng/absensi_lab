import Mso from './Mso';
import { metrics } from './data';

function MetricCard({ m }) {
  if (m.track) {
    // Card with progress track (ontime / late / leave / absent)
    return (
      <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-space-xs">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-bold">
            {m.label}
          </span>
          <div className={`w-8 h-8 rounded-lg ${m.color} flex items-center justify-center font-bold`}>
            {m.icon && <Mso name={m.icon} className={m.iconColor} />}
          </div>
        </div>
        <div className="flex items-baseline gap-space-xs">
          <span className={`font-headline-lg text-headline-lg font-bold ${m.valueColor}`}>{m.value}</span>
          <span className="font-label-md text-label-md px-2 py-0.5 rounded-full bg-surface-container-lowest text-outline font-bold">
            {m.sub}
          </span>
        </div>
        <div className="mt-space-sm w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
          <div className={`${m.track.color} h-full rounded-full`} style={{ width: m.track.width }} />
        </div>
      </div>
    );
  }

  // Card without track (total staff)
  return (
    <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-space-xs">
        <span className={`font-label-sm text-label-sm uppercase tracking-wider ${m.badgeColor || 'text-outline'} font-bold`}>
          {m.label}
        </span>
        <div className={`w-8 h-8 rounded-lg ${m.color || 'bg-surface-container-high'} flex items-center justify-center text-on-surface`}>
          {m.icon && <Mso name={m.icon} />}
        </div>
      </div>
      <div className="flex items-baseline gap-space-xs">
        <span className="font-headline-lg text-headline-lg font-bold text-on-surface">{m.value}</span>
        <span className="font-body-sm text-body-sm text-outline">{m.sub}</span>
      </div>
      <div className="mt-space-sm pt-space-xs flex items-center justify-between text-body-sm font-body-sm">
        <span className={`${m.badgeColor || 'text-tertiary'} font-semibold flex items-center gap-0.5`}>
          {m.badge}
        </span>
        <span className="text-outline">{m.footer}</span>
      </div>
    </div>
  );
}

export default function MetricCards() {
  return (
    <div className="mb-space-lg grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-space-md">
      {metrics.map((m) => (
        <MetricCard key={m.key} m={m} />
      ))}
    </div>
  );
}
