import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import DriverLogin from './components/driver/DriverLogin';
import DriverDashboard from './components/driver/DriverDashboard';
import MaintenanceLogin from './components/maintenance/MaintenanceLogin';
import MaintenanceDashboard from './components/maintenance/MaintenanceDashboard';
import { DEMO_MODE } from './demoApi';

const currentRoute = () => DEMO_MODE
  ? (window.location.hash.slice(1) || '/')
  : window.location.pathname;

function App() {
  const [route, setRoute] = useState(currentRoute());

  // Driver session state
  const [driverState, setDriverState] = useState<{truckId: string, driverName: string} | null>(() => {
    const truckId = localStorage.getItem('driver_truck_id');
    const driverName = localStorage.getItem('driver_name');
    if (truckId && driverName) return { truckId, driverName };
    return null;
  });

  // Maintenance worker session state
  const [mntState, setMntState] = useState<{workerId: string, workerName: string, zone: string} | null>(() => {
    const workerId = localStorage.getItem('mnt_worker_id');
    const workerName = localStorage.getItem('mnt_worker_name');
    const zone = localStorage.getItem('mnt_worker_zone') || '';
    if (workerId && workerName) return { workerId, workerName, zone };
    return null;
  });

  useEffect(() => {
    const handleRouteChange = () => setRoute(currentRoute());
    const eventName = DEMO_MODE ? 'hashchange' : 'popstate';
    window.addEventListener(eventName, handleRouteChange);
    return () => window.removeEventListener(eventName, handleRouteChange);
  }, []);

  const navigate = (path: string) => {
    if (DEMO_MODE) {
      window.location.hash = path;
      setRoute(path);
      return;
    }
    window.history.pushState({}, '', path);
    setRoute(path);
  };

  // Driver auth handlers
  const handleDriverLogin = (truckId: string, driverName: string) => {
    setDriverState({ truckId, driverName });
    navigate('/driver/dashboard');
  };
  const handleDriverLogout = () => {
    localStorage.removeItem('driver_truck_id');
    localStorage.removeItem('driver_name');
    setDriverState(null);
    navigate('/driver');
  };

  // Maintenance auth handlers
  const handleMntLogin = (workerId: string, workerName: string, zone: string) => {
    setMntState({ workerId, workerName, zone });
    navigate('/maintenance/dashboard');
  };
  const handleMntLogout = () => {
    localStorage.removeItem('mnt_worker_id');
    localStorage.removeItem('mnt_worker_name');
    localStorage.removeItem('mnt_worker_zone');
    setMntState(null);
    navigate('/maintenance');
  };

  // ── Routing ─────────────────────────────────────────────────
  if (route.startsWith('/driver/dashboard')) {
    if (!driverState) { navigate('/driver'); return null; }
    return <DriverDashboard truckId={driverState.truckId} driverName={driverState.driverName} onLogout={handleDriverLogout} />;
  }
  if (route.startsWith('/driver')) {
    if (driverState) { navigate('/driver/dashboard'); return null; }
    return <DriverLogin onLogin={handleDriverLogin} />;
  }

  if (route.startsWith('/maintenance/dashboard')) {
    if (!mntState) { navigate('/maintenance'); return null; }
    return <MaintenanceDashboard workerId={mntState.workerId} workerName={mntState.workerName} zone={mntState.zone} onLogout={handleMntLogout} />;
  }
  if (route.startsWith('/maintenance')) {
    if (mntState) { navigate('/maintenance/dashboard'); return null; }
    return <MaintenanceLogin onLogin={handleMntLogin} />;
  }

  // Admin dashboard (default route)
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {DEMO_MODE && (
        <div style={{
          position: 'fixed', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 10000,
          padding: '6px 12px', borderRadius: 999, background: 'rgba(15,23,42,0.9)',
          color: '#67e8f9', border: '1px solid rgba(103,232,249,0.35)', fontSize: 12,
          fontFamily: 'Inter, sans-serif', boxShadow: '0 6px 20px rgba(0,0,0,0.25)'
        }}>
          Static demo · simulated fill data · generated locally
        </div>
      )}
      <Dashboard />
    </div>
  );
}

export default App;

