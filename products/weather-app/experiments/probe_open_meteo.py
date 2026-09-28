"""Small read-only API feasibility probe; not a forecast-accuracy test.

Uses the non-commercial evaluation endpoint. No credentials or dependencies.
"""

import argparse
import hashlib
import json
import platform
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    cases = [
        ("beijing-short", "https://api.open-meteo.com/v1/forecast", {
            "latitude": 39.90, "longitude": 116.40, "forecast_days": 16,
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
            "timezone": "Asia/Shanghai"}, "daily"),
        ("beijing-ec46", "https://seasonal-api.open-meteo.com/v1/seasonal", {
            "latitude": 39.90, "longitude": 116.40, "forecast_days": 46,
            "models": "ecmwf_ec46",
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
            "timezone": "Asia/Shanghai"}, "daily"),
        ("beijing-weekly", "https://seasonal-api.open-meteo.com/v1/seasonal", {
            "latitude": 39.90, "longitude": 116.40, "forecast_days": 46,
            "models": "ecmwf_ec46",
            "weekly": "temperature_2m_anomaly,precipitation_anomaly"}, "weekly"),
        ("berlin-ec46", "https://seasonal-api.open-meteo.com/v1/seasonal", {
            "latitude": 52.52, "longitude": 13.41, "forecast_days": 46,
            "models": "ecmwf_ec46", "daily": "temperature_2m_max",
            "timezone": "Europe/Berlin"}, "daily"),
    ]
    report = {
        "purpose": "Connectivity, response coverage and missing values only; no accuracy validation",
        "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
        "python": sys.version, "platform": platform.platform(),
        "attribution": "Weather data by Open-Meteo.com, based on ECMWF and other providers. CC BY 4.0.",
        "licence": "https://creativecommons.org/licenses/by/4.0/",
        "modifications": "Response coverage statistics derived from original API JSON; raw responses unchanged.",
        "cases": [],
    }
    failed = False
    for name, endpoint, params, block in cases:
        url = endpoint + "?" + urlencode(params)
        entry = {"name": name, "url": url, "requested_parameters": params}
        start = time.monotonic()
        try:
            with urlopen(Request(url, headers={"User-Agent": "WeatherAppResearch/0.1"}), timeout=45) as response:
                raw = response.read()
                entry["http_status"] = response.status
                entry["http_date"] = response.headers.get("Date")
            data = json.loads(raw)
            (args.output / (name + ".json")).write_bytes(raw)
            times = data[block]["time"]
            series = {key: value for key, value in data[block].items() if key != "time"}
            entry.update({
                "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest(),
                "returned_coordinates": [data["latitude"], data["longitude"]],
                "timezone": data.get("timezone"), "units": data[block + "_units"],
                "row_count": len(times), "first_date": times[0], "last_date": times[-1],
                "series_count": len(series),
                "series": {key: {
                    "length": len(values), "non_null_count": sum(v is not None for v in values),
                    "first_valid_date": next((t for t, v in zip(times, values) if v is not None), None),
                    "last_valid_date": next((t for t, v in reversed(list(zip(times, values))) if v is not None), None),
                } for key, values in series.items()},
            })
            entry["aligned"] = all(len(values) == len(times) for values in series.values())
            entry["has_non_null_data"] = all(any(v is not None for v in values) for values in series.values())
            failed |= not (entry["aligned"] and entry["has_non_null_data"])
        except HTTPError as error:
            entry.update({"error": str(error), "body": error.read().decode("utf-8", errors="replace")[:1000]})
            failed = True
        except Exception as error:
            entry["error"] = str(error)
            failed = True
        entry["elapsed_seconds"] = round(time.monotonic() - start, 3)
        report["cases"].append(entry)
        print(json.dumps({k: v for k, v in entry.items() if k not in ("series", "units", "requested_parameters")}, ensure_ascii=False))
    (args.output / "summary.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return int(failed)


if __name__ == "__main__":
    raise SystemExit(main())
