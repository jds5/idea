import Foundation

enum ProbeError: Error { case expected }
func throwingValue() throws -> Int { throw ProbeError.expected }

@main struct AssertionProbe {
    static func main() {
        switch CommandLine.arguments.dropFirst().first ?? "positive" {
        case "positive":
            XCTAssertEqual(1, 1)
            XCTAssertNotEqual(1, 2)
            XCTAssertTrue(true)
            XCTAssertFalse(false)
            XCTAssertNil(Optional<Int>.none)
            var handled = false
            XCTAssertThrowsError(try throwingValue()) { error in
                XCTAssertTrue(error is ProbeError)
                handled = true
            }
            XCTAssertTrue(handled)
            print("Positive assertion controls passed.")
        case "equal": XCTAssertEqual(1, 2)
        case "not-equal": XCTAssertNotEqual(1, 1)
        case "true": XCTAssertTrue(false)
        case "false": XCTAssertFalse(true)
        case "nil": XCTAssertNil(Optional(1))
        case "throws": XCTAssertThrowsError(1)
        case "unexpected-error": XCTAssertEqual(try throwingValue(), 1)
        default: fatalError("Unknown probe")
        }
    }
}
