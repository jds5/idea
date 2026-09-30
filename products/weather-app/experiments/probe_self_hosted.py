"""Probe an already running local Open-Meteo container; no paid API calls."""
import argparse
import datetime as dt
import hashlib
import json
import pathlib
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8080")
    parser.add_argument("--output", default="results/local-run/self-hosted")
    args = parser.parse_args()
    output = pathlib.Path(args.output)
    output.mkdir(parents=True, exist_ok=False)
    common = {"latitude": 51.5074, "longitude": -0.1278, "timezone": "Europe/London"}
    cases = [
        ("aws-catalog", "https://openmeteo.s3.amazonaws.com/?list-type=2&delimiter=/&prefix=data/&max-keys=1000"),
        ("london-short", args.base + "/v1/forecast?" + urllib.parse.urlencode({**common, "models": "ecmwf_ifs025,gfs_global,icon_global", "hourly": "temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m", "forecast_days": 2})),
        ("london-ec46-weekly", args.base + "/v1/seasonal?" + urllib.parse.urlencode({**common, "models": "ecmwf_ec46", "weekly": "temperature_2m_anomaly,precipitation_anomaly", "forecast_days": 46})),
    ]
    records = []
    for name, url in cases:
        record = {"name": name, "url": url, "requested_at": dt.datetime.now(dt.timezone.utc).isoformat()}
        start = time.monotonic()
        try:
            with urllib.request.urlopen(url, timeout=90) as response:
                raw = response.read(2_000_001)
                if len(raw) > 2_000_000:
                    raise ValueError("Response exceeded 2 MB probe limit")
                record.update(status=response.status, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())
            (output / (name + (".xml" if name == "aws-catalog" else ".json"))).write_bytes(raw)
            if name == "aws-catalog":
                root = ET.fromstring(raw)
                ns = {"s": "http://s3.amazonaws.com/doc/2006-03-01/"}
                prefixes = [p.text for p in root.findall("s:CommonPrefixes/s:Prefix", ns)]
                record["catalog"] = {"count": len(prefixes), "truncated": root.findtext("s:IsTruncated", namespaces=ns),
                                     "ec46": [p for p in prefixes if "ec46" in p]}
            else:
                payload = json.loads(raw)
                block = payload.get("hourly", payload.get("weekly", {}))
                record["coverage"] = {"first": block.get("time", [None])[0], "last": block.get("time", [None])[-1],
                                      "series": {key: {"rows": len(values), "non_null": sum(x is not None for x in values)}
                                                 for key, values in block.items() if key != "time"},
                                      "metadata": {key: value for key, value in payload.items() if key not in ("hourly", "weekly")}}
        except Exception as exc:
            record["error"] = str(exc)
            if hasattr(exc, "read"):
                record["error_body"] = exc.read(4096).decode("utf-8", errors="replace")
        record["elapsed_seconds"] = round(time.monotonic() - start, 3)
        records.append(record)
        print(json.dumps(record, ensure_ascii=False), flush=True)
    (output / "summary.json").write_text(json.dumps({"requests": records, "scope": "Availability only. API hourly output does not prove native hourly resolution; no accuracy or load test."}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
