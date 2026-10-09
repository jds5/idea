// Minimal fail-fast assertions for this experiment, NOT an XCTest implementation.
// Only the synchronous assertions currently used by the two packages are supported.
import Foundation

class PortableCase {}

private func checked<T>(_ expression: () throws -> T, file: StaticString, line: UInt) -> T {
    do { return try expression() }
    catch { fatalError("Unexpected error: \(error)", file: (file), line: line) }
}

func XCTAssertEqual<T: Equatable>(_ actual: @autoclosure () throws -> T,
    _ expected: @autoclosure () throws -> T, _ message: String = "",
    file: StaticString = #filePath, line: UInt = #line) {
    let a = checked(actual, file: (file), line: line)
    let b = checked(expected, file: (file), line: line)
    guard a == b else { fatalError("Expected \(a) == \(b). \(message)", file: (file), line: line) }
}

func XCTAssertNotEqual<T: Equatable>(_ actual: @autoclosure () throws -> T,
    _ expected: @autoclosure () throws -> T, _ message: String = "",
    file: StaticString = #filePath, line: UInt = #line) {
    let a = checked(actual, file: (file), line: line)
    let b = checked(expected, file: (file), line: line)
    guard a != b else { fatalError("Expected unequal values. \(message)", file: (file), line: line) }
}

func XCTAssertTrue(_ expression: @autoclosure () throws -> Bool, _ message: String = "",
    file: StaticString = #filePath, line: UInt = #line) {
    guard checked(expression, file: (file), line: line) else {
        fatalError("Expected true. \(message)", file: (file), line: line)
    }
}

func XCTAssertFalse(_ expression: @autoclosure () throws -> Bool, _ message: String = "",
    file: StaticString = #filePath, line: UInt = #line) {
    guard !checked(expression, file: (file), line: line) else {
        fatalError("Expected false. \(message)", file: (file), line: line)
    }
}

func XCTAssertNil<T>(_ expression: @autoclosure () throws -> T?, _ message: String = "",
    file: StaticString = #filePath, line: UInt = #line) {
    guard case nil = checked(expression, file: (file), line: line) else {
        fatalError("Expected nil. \(message)", file: (file), line: line)
    }
}

func XCTAssertThrowsError<T>(_ expression: @autoclosure () throws -> T,
    _ message: String = "", file: StaticString = #filePath, line: UInt = #line,
    _ errorHandler: (Error) -> Void = { _ in }) {
    do { _ = try expression() }
    catch { errorHandler(error); return }
    fatalError("Expected an error. \(message)", file: (file), line: line)
}
