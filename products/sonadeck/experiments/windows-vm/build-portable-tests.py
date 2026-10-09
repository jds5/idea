"""Generate a fail-fast CLI from unchanged synchronous XCTest test bodies.

This is NOT XCTest execution. It exists for the CLT-only macOS experiment.
Reject unsupported APIs/lifecycle/async tests instead of silently skipping them.
"""
import argparse
import re
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('output', type=Path)
args = parser.parse_args()
here = Path(__file__).resolve().parent
product = here.parents[1]
files = [product / 'app/ProfileDomain/Tests/ProfileDomainTests/TransitionPlannerTests.swift',
         product / 'app/SonaDeckPrototype/Tests/PrototypeModelTests/SimulationSessionTests.swift']
supported = {'XCTAssertEqual', 'XCTAssertNotEqual', 'XCTAssertTrue', 'XCTAssertFalse',
             'XCTAssertNil', 'XCTAssertThrowsError', 'XCTestCase'}
parts = [here.joinpath('portable-assertions.swift').read_text(encoding='utf-8')]
calls = []
for path in files:
    source = path.read_text(encoding='utf-8')
    names = set(re.findall(r'\bXCT\w+', source)) - {'XCTest'}
    assert names <= supported, f'Unsupported assertions: {names - supported}'
    assert not re.search(r'\b(async|setUp|tearDown|override|measure|expectation)\b', source)
    suite = re.findall(r'final class (\w+): XCTestCase', source)
    assert len(suite) == 1, path
    tests = re.findall(r'func (test\w+)\(\)\s*(throws)?\s*\{', source)
    assert len(tests) == len(re.findall(r'func test\w+', source)), path
    assert tests, path
    parts.append(f'#sourceLocation(file: "{path.relative_to(product).as_posix()}", line: 1)\n'
                 + source.replace('import XCTest', '').replace(': XCTestCase', ': PortableCase')
                 + '\n#sourceLocation()')
    for method, throws in tests:
        calls.append(f'        {"try " if throws else ""}{suite[0]}().{method}()\n'
                     f'        print("PASS {suite[0]}.{method}")')
parts.append('@main struct PortableChecks {\n    static func main() throws {\n'
             '        print("Portable synchronous assertions; NOT XCTest execution.")\n'
             + '\n'.join(calls)
             + f'\n        print("portable_cases_passed={len(calls)}")\n    }}\n}}\n')
args.output.write_text('\n\n'.join(parts), encoding='utf-8', newline='\n')
print(f'Generated {len(calls)} unchanged test bodies: {args.output}')
