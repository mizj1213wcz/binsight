export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

interface DemoSnapshot {
  generated_at: string;
  config: Record<string, unknown>;
  bins: any[];
  predictions: any[];
  routes: any[];
  street_routes: Record<string, any>;
  trucks: any[];
  notifications: any[];
  analytics: Record<string, any>;
  maintenance_jobs: any[];
  maintenance_workers: any[];
  maintenance_stats: Record<string, unknown>;
  maintenance_bins: any[];
  daily_report: Record<string, unknown>;
}

const jsonResponse = (body: JsonValue, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
});

const requestBody = (init?: RequestInit): Record<string, any> => {
  if (typeof init?.body !== 'string' || !init.body) return {};
  try { return JSON.parse(init.body); } catch { return {}; }
};

export function installDemoApi() {
  if (!DEMO_MODE || typeof window === 'undefined') return;

  const networkFetch = window.fetch.bind(window);
  let snapshotPromise: Promise<DemoSnapshot> | null = null;
  const loadSnapshot = () => {
    if (!snapshotPromise) {
      const snapshotUrl = `${import.meta.env.BASE_URL}demo/demo-data.json`;
      snapshotPromise = networkFetch(snapshotUrl).then(async response => {
        if (!response.ok) throw new Error(`Unable to load static demo data (${response.status})`);
        return response.json();
      });
    }
    return snapshotPromise;
  };

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(rawUrl, window.location.origin);
    const apiIndex = url.pathname.indexOf('/api/');
    if (apiIndex < 0) return networkFetch(input, init);

    const path = url.pathname.slice(apiIndex);
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const demo = await loadSnapshot();

    if (path === '/api/config') return jsonResponse(demo.config);
    if (path === '/api/health') return jsonResponse({ status: 'ok', mode: 'static-demo', generated_at: demo.generated_at });
    if (path === '/api/bins' || path === '/api/bins/live') return jsonResponse(demo.bins);
    if (path === '/api/predictions') return jsonResponse(demo.predictions);
    if (path === '/api/routes') {
      return jsonResponse(demo.routes.map(route => ({
        ...route,
        street_route: demo.street_routes?.[route.truck_id] ?? null,
      })));
    }
    if (path === '/api/trucks') return jsonResponse(demo.trucks);
    if (path === '/api/notifications' || path === '/api/notifications/count') {
      return path.endsWith('/count')
        ? jsonResponse({ unread_count: demo.notifications.filter(item => !item.is_read).length })
        : jsonResponse(demo.notifications);
    }
    if (path === '/api/analytics') return jsonResponse(demo.analytics);
    if (path === '/api/reports/daily') return jsonResponse(demo.daily_report);
    if (path === '/api/maintenance/stats') return jsonResponse(demo.maintenance_stats);
    if (path === '/api/maintenance/workers') return jsonResponse(demo.maintenance_workers);
    if (path === '/api/maintenance/bins') return jsonResponse(demo.maintenance_bins);
    if (path === '/api/maintenance/jobs' && method === 'GET') {
      const workerId = url.searchParams.get('worker_id');
      const status = url.searchParams.get('status');
      const jobs = demo.maintenance_jobs.filter(job =>
        (!workerId || job.worker_id === workerId) && (!status || job.status === status)
      );
      return jsonResponse(jobs);
    }

    const binMatch = path.match(/^\/api\/bins\/([^/]+)$/);
    if (binMatch && method === 'GET') {
      const binId = decodeURIComponent(binMatch[1]);
      const bin = demo.bins.find(item => item.bin_id === binId);
      if (!bin) return jsonResponse({ detail: 'Bin not found in static snapshot' }, 404);
      const prediction = demo.predictions.find(item => item.bin_id === binId);
      return jsonResponse({
        ...bin,
        history_7d: [],
        prediction_tomorrow: prediction ? {
          prediction_time: demo.generated_at,
          predicted_fill: prediction.predicted_fill,
          overflow_probability: prediction.overflow_probability,
        } : null,
      });
    }

    if (path === '/api/driver/login' && method === 'POST') {
      const payload = requestBody(init);
      const truck = demo.trucks.find(item => item.truck_id === String(payload.truck_id || '').toUpperCase());
      return truck
        ? jsonResponse({ status: 'success', truck_id: truck.truck_id, driver: truck.driver, plate_number: truck.plate_number })
        : jsonResponse({ detail: 'Invalid Truck ID' }, 401);
    }

    const driverRouteMatch = path.match(/^\/api\/driver\/([^/]+)\/route$/);
    if (driverRouteMatch) {
      const truckId = decodeURIComponent(driverRouteMatch[1]);
      const route = demo.routes.find(item => item.truck_id === truckId);
      if (!route) return jsonResponse({ truck_id: truckId, has_route: false, route: null });
      const enrichedPath = (route.path || []).map((node: any) => {
        if (!node.bin_id || node.bin_id === 'DEPOT') {
          return { type: 'depot', latitude: node.latitude, longitude: node.longitude };
        }
        const bin = demo.bins.find(item => item.bin_id === node.bin_id) || {};
        return { type: 'bin', ...node, ...bin };
      });
      return jsonResponse({
        truck_id: truckId,
        has_route: true,
        route: {
          route_id: route.route_id,
          distance_km: route.distance_km,
          duration_hours: route.duration_hours,
          path: enrichedPath,
          street_route: demo.street_routes?.[truckId] ?? null,
        },
      });
    }

    if (path === '/api/maintenance/login' && method === 'POST') {
      const payload = requestBody(init);
      const worker = demo.maintenance_workers.find(item => item.worker_id === String(payload.worker_id || '').toUpperCase());
      return worker
        ? jsonResponse({ status: 'success', worker_id: worker.worker_id, name: worker.name, phone: worker.phone, zone: worker.zone, worker_status: worker.status })
        : jsonResponse({ detail: 'Invalid Worker ID' }, 401);
    }

    const qrTokenMatch = path.match(/^\/api\/qr\/token\/([^/]+)\/([^/]+)$/);
    if (qrTokenMatch) return jsonResponse({ status: 'success', token: `demo-${qrTokenMatch[1]}-${qrTokenMatch[2]}` });

    // Mutating controls remain clickable for presentation purposes, but the
    // committed snapshot is intentionally immutable.
    if (method !== 'GET') {
      return jsonResponse({ status: 'success', mode: 'static-demo', message: 'Demo action simulated locally; the published snapshot was not changed.' });
    }

    return jsonResponse({ detail: `Static demo endpoint not available: ${path}` }, 404);
  };
}
