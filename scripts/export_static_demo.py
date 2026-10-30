"""Export the locally computed API state as a GitHub Pages snapshot."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.main import app  # noqa: E402


DEFAULT_OUTPUT = ROOT / "frontend" / "public" / "demo" / "demo-data.json"

ENDPOINTS = {
    "config": "/api/config",
    "bins": "/api/bins",
    "predictions": "/api/predictions",
    "routes": "/api/routes",
    "trucks": "/api/trucks",
    "notifications": "/api/notifications?limit=50",
    "analytics": "/api/analytics",
    "maintenance_jobs": "/api/maintenance/jobs",
    "maintenance_workers": "/api/maintenance/workers",
    "maintenance_stats": "/api/maintenance/stats",
    "maintenance_bins": "/api/maintenance/bins",
    "daily_report": "/api/reports/daily",
}


def export_snapshot(output: Path) -> None:
    snapshot = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "static-demo",
        "data_note": "Locations are City of Edinburgh open data; fill levels and forecasts are simulated.",
    }
    with TestClient(app) as client:
        for key, endpoint in ENDPOINTS.items():
            response = client.get(endpoint)
            response.raise_for_status()
            snapshot[key] = response.json()

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Static snapshot: {output}")
    print(f"Size: {output.stat().st_size / 1_000_000:.2f} MB")
    print(f"Bins: {len(snapshot['bins']):,}; predictions: {len(snapshot['predictions']):,}; routes: {len(snapshot['routes']):,}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    export_snapshot(args.output.resolve())


if __name__ == "__main__":
    main()
