"""Render the captured Swift test log for browser screenshots."""

from html import escape
from pathlib import Path


REPORT_DIR = Path(__file__).resolve().parent
LOG = (REPORT_DIR / "swift-test.log").read_text(encoding="utf-8")
MARKER = "Test Suite 'All tests' started"
assert MARKER in LOG, "Expected XCTest output is missing"
build, tests = LOG.split(MARKER, 1)


def write_view(filename: str, title: str, content: str) -> None:
    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{escape(title)}</title>
<style>
  html {{ background: #101827; color: #e5edf6; }}
  body {{ box-sizing: border-box; width: 1440px; margin: 0 auto; padding: 36px 44px;
          font-family: Arial, sans-serif; }}
  h1 {{ margin: 0 0 8px; font-size: 26px; }}
  p {{ margin: 0 0 24px; color: #a9bbcf; font-size: 15px; }}
  pre {{ margin: 0; padding: 24px; border: 1px solid #38506d; border-radius: 12px;
         background: #0a111e; color: #dce8f6; font: 15px/1.5 Consolas, monospace;
         white-space: pre-wrap; overflow-wrap: anywhere; }}
</style>
</head>
<body>
<h1>{escape(title)}</h1>
<p>SonaDeck ProfileDomain · Docker / Swift 6.2.4 · Source: swift-test.log</p>
<pre>{escape(content.strip())}</pre>
</body>
</html>
"""
    (REPORT_DIR / "screenshots" / filename).write_text(page, encoding="utf-8")


write_view("build.html", "Clean container build", build)
write_view("tests.html", "XCTest results", MARKER + tests)
