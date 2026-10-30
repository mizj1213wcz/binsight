"""
Turn the City of Edinburgh Council "Communal Bins" export into collection stops.

Steps
  1. keep general-waste communal bins (config.city.FEATURE_TYPES)
  2. convert British National Grid (EPSG:27700) coordinates to WGS84
  3. drop records whose coordinates fall outside the council area
  4. merge asset records at the same location (~1 m) into one stop: a truck stops once
  5. capacity = number_bins x bin_size, summed over the merged records
  6. assign an area type (distance ring from the city centre) and a collection zone (k-means)

Usage:  python -m ml.data_generator.edinburgh_stops
"""
import math
import os

import numpy as np
import pandas as pd

from config import city


def _haversine_km(lat1, lon1, lat2, lon2):
    la1, lo1, la2, lo2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((la2 - la1) / 2) ** 2 + np.cos(la1) * np.cos(la2) * np.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371.0 * np.arcsin(np.sqrt(a))


def _area_type(dist_km: float) -> str:
    for limit, name in city.AREA_RINGS_KM:
        if dist_km < limit:
            return name
    return city.AREA_RINGS_KM[-1][1]


def build_stops(raw_csv: str = city.RAW_BINS_CSV, verbose: bool = True) -> pd.DataFrame:
    from pyproj import Transformer
    from sklearn.cluster import KMeans

    raw = pd.read_csv(raw_csv, encoding="utf-8-sig")
    df = raw[raw["feature_type_name"].isin(city.FEATURE_TYPES)].copy()

    x = pd.to_numeric(df["X"], errors="coerce")
    y = pd.to_numeric(df["Y"], errors="coerce")
    df = df[x.notna() & y.notna()].copy()
    to_wgs84 = Transformer.from_crs("EPSG:27700", "EPSG:4326", always_xy=True)
    df["longitude"], df["latitude"] = to_wgs84.transform(df["X"].to_numpy(), df["Y"].to_numpy())

    b = city.CITY_BBOX
    inside = df.latitude.between(b["south"], b["north"]) & df.longitude.between(b["west"], b["east"])
    dropped = df.loc[~inside, "central_asset_id"].tolist()
    df = df[inside].copy()

    size = pd.to_numeric(df["bin_size"], errors="coerce").fillna(city.DEFAULT_BIN_SIZE_L)
    count = pd.to_numeric(df["number_bins"], errors="coerce").fillna(1).clip(lower=1)
    df["capacity_l"] = size * count
    df["n_bins"] = count

    key = df.latitude.round(5).astype(str) + "," + df.longitude.round(5).astype(str)
    g = df.groupby(key, sort=False)
    stops = g.agg(
        source_asset_id=("central_asset_id", "first"),
        latitude=("latitude", "mean"),
        longitude=("longitude", "mean"),
        site_name=("site_name", "first"),
        feature_location=("feature_location", "first"),
        capacity_l=("capacity_l", "sum"),
        n_bins=("n_bins", "sum"),
    ).reset_index(drop=True)
    stops["n_asset_records"] = g.size().to_numpy()

    # API-safe id: "CEC/600858670" -> "EDI-600858670"
    digits = stops["source_asset_id"].astype(str).str.replace(r"\D", "", regex=True)
    stops["bin_id"] = "EDI-" + digits.str.lstrip("0").replace("", "0")
    dup = stops["bin_id"].duplicated(keep=False)
    stops.loc[dup, "bin_id"] += "-" + stops[dup].groupby("bin_id").cumcount().astype(str)

    stops["street_name"] = (stops["site_name"].fillna("").str.strip() + ", " +
                            stops["feature_location"].fillna("").str.strip()).str.strip(", ").str[:200]
    cx, cy = city.CITY_CENTRE_POINT
    stops["dist_centre_km"] = _haversine_km(stops.latitude, stops.longitude, cx, cy).round(2)
    stops["area_type"] = stops["dist_centre_km"].map(_area_type)

    # Collection zones: k-means on a local metric projection, numbered west -> east
    xy = np.c_[stops.longitude * math.cos(math.radians(55.95)), stops.latitude]
    km = KMeans(n_clusters=city.N_COLLECTION_ZONES, n_init=10, random_state=0).fit(xy)
    order = np.argsort(km.cluster_centers_[:, 0])
    rank = np.empty_like(order)
    rank[order] = np.arange(1, len(order) + 1)
    stops["ward_number"] = rank[km.labels_]
    stops["ward"] = stops["ward_number"].map(lambda k: f"Zone-{k:02d}")
    stops["area_name"] = stops["ward"].str.replace("-", " ")

    cols = ["bin_id", "source_asset_id", "latitude", "longitude", "street_name", "area_name", "ward",
            "ward_number", "area_type", "capacity_l", "n_bins", "n_asset_records", "dist_centre_km"]
    stops = stops[cols].sort_values("bin_id").reset_index(drop=True)
    stops["latitude"] = stops["latitude"].round(6)
    stops["longitude"] = stops["longitude"].round(6)

    if verbose:
        print(f"  {len(raw):,} records in export, {int(inside.sum()) + len(dropped):,} general-waste communal bins")
        if dropped:
            print(f"  dropped {len(dropped)} with coordinates outside {city.CITY_NAME}: {dropped}")
        print(f"  merged into {len(stops):,} collection stops")
        print("  area types: " + ", ".join(f"{k} {v}" for k, v in stops.area_type.value_counts().items()))
    return stops


def load_stops(rebuild: bool = False) -> pd.DataFrame:
    if rebuild or not os.path.exists(city.STOPS_CSV):
        stops = build_stops()
        stops.to_csv(city.STOPS_CSV, index=False)
        return stops
    return pd.read_csv(city.STOPS_CSV)


if __name__ == "__main__":
    s = build_stops()
    s.to_csv(city.STOPS_CSV, index=False)
    print(f"  wrote {city.STOPS_CSV}")
