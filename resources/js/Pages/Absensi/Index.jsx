import HeaderDeck from './HeaderDeck';
import MetricCards from './MetricCards';
import CalendarGrid from './CalendarGrid';
import DetailPanel from './DetailPanel';
import Navbar from './Navbar';
import Topbar from './Topbar';

export default function AbsensiIndex() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      {/* Sidebar navigation */}
      <Navbar />

      {/* Main content area (offset by sidebar width) */}
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        {/* Topbar */}
        <Topbar />

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto">
          <div className="w-full px-space-md sm:px-space-lg lg:px-space-lg py-space-lg">
            {/* Top Intro & Control Deck */}
            <HeaderDeck />

            {/* Realtime Metric Badges */}
            <MetricCards />

            {/* Main Canvas: 65% Calendar + 35% Detail Panel */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start pb-space-xl">
              <CalendarGrid />
              <DetailPanel />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
