import HeaderDeck from './HeaderDeck';
import MetricCards from './MetricCards';
import CalendarGrid from './CalendarGrid';
import DetailPanel from './DetailPanel';

export default function AbsensiIndex() {
  return (
    <main className="overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Intro & Control Deck */}
        <HeaderDeck />

        {/* Realtime Metric Badges */}
        <MetricCards />

        {/* Main Canvas: 60% Calendar + 40% Detail Panel */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start pb-space-xl">
          <CalendarGrid />
          <DetailPanel />
        </div>
      </div>
    </main>
  );
}
