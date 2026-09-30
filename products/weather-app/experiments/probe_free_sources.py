"""Small, bounded availability probe. Not an accuracy or load test."""
import argparse
import collections
import datetime as dt
import hashlib
import json
import pathlib
import platform
import time
import urllib.request

UA = "DaywardResearch/0.1 (https://github.com/jds5/idea)"
LIMIT = 2_000_000


def fetch(name, url, output, results):
    record = {"name": name, "url": url, "requested_at": dt.datetime.now(dt.timezone.utc).isoformat()}
    start = time.monotonic()
    try:
        request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/geo+json, application/json"})
        with urllib.request.urlopen(request, timeout=25) as response:
            body = response.read(LIMIT + 1)
            if len(body) > LIMIT:
                raise ValueError("Response exceeded 2 MB probe limit")
            record.update(status=response.status, bytes=len(body), sha256=hashlib.sha256(body).hexdigest(),
                          headers={key: response.headers.get(key) for key in ("Date", "Expires", "Last-Modified", "Cache-Control")})
        payload = json.loads(body)
        (output / (name + ".json")).write_bytes(body)
        return payload
    except Exception as exc:
        record["error"] = str(exc)
        return None
    finally:
        record["elapsed_seconds"] = round(time.monotonic() - start, 3)
        results.append(record)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="results/local-run/free-sources")
    args = parser.parse_args()
    output = pathlib.Path(args.output)
    output.mkdir(parents=True, exist_ok=False)
    results = []
    for name, lat, lon in (("met-london", 51.5074, -0.1278), ("met-berlin", 52.52, 13.405)):
        payload = fetch(name, f"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat={lat}&lon={lon}", output, results)
        if payload:
            props = payload["properties"]
            series = props["timeseries"]
            stamps = [dt.datetime.fromisoformat(row["time"].replace("Z", "+00:00")) for row in series]
            fields = collections.Counter(key for row in series for key in row["data"]["instant"]["details"])
            results[-1]["coverage"] = {
                "updated_at": props["meta"]["updated_at"], "rows": len(series),
                "first": series[0]["time"], "last": series[-1]["time"],
                "step_hours": dict(collections.Counter(str((b - a).total_seconds() / 3600) for a, b in zip(stamps, stamps[1:]))),
                "instant_field_rows": dict(fields),
                "next_1_hour_precipitation_rows": sum("precipitation_amount" in row["data"].get("next_1_hours", {}).get("details", {}) for row in series),
                "units": props["meta"]["units"],
            }
    point = fetch("nws-new-york-point", "https://api.weather.gov/points/40.7128,-74.0060", output, results)
    if point and point.get("properties", {}).get("forecastHourly"):
        payload = fetch("nws-new-york-hourly", point["properties"]["forecastHourly"], output, results)
        if payload:
            props = payload["properties"]
            periods = props.get("periods", [])
            results[-1]["coverage"] = {
                "updated_at": props.get("updateTime"), "rows": len(periods),
                "first": periods[0]["startTime"] if periods else None,
                "last": periods[-1]["endTime"] if periods else None,
                "fields": sorted(set(key for row in periods for key in row)),
            }
    summary = {"python": platform.python_version(), "platform": platform.platform(), "user_agent": UA, "requests": results,
               "scope": "One-shot public endpoint availability and field coverage only; no accuracy, SLA, or production validation."}
    (output / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
