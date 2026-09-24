import Foundation

/// Stable application identity. A process ID or display name is never used for matching.
public struct AppIdentity: Codable, Hashable, Sendable {
    public let bundleIdentifier: String

    public init(bundleIdentifier: String) {
        self.bundleIdentifier = bundleIdentifier
    }
}

public enum OutputTarget: Codable, Equatable, Sendable {
    case followSystem
    case device(uid: String)
}

public struct AppRule: Codable, Equatable, Sendable {
    public let app: AppIdentity
    public let gain: Double
    public let muted: Bool
    public let output: OutputTarget

    public init(app: AppIdentity, gain: Double, muted: Bool, output: OutputTarget) {
        self.app = app
        self.gain = gain
        self.muted = muted
        self.output = output
    }
}

/// A saved target. This first implementation slice handles application rules only.
public struct Profile: Codable, Equatable, Sendable {
    public let id: UUID
    public let name: String
    public let revision: UInt64
    public let rules: [AppRule]

    public init(id: UUID, name: String, revision: UInt64, rules: [AppRule]) {
        self.id = id
        self.name = name
        self.revision = revision
        self.rules = rules
    }
}

public enum ProfileValidationError: Error, Equatable, Sendable {
    case emptyName
    case invalidRevision
    case invalidAppIdentity
    case duplicateApp(AppIdentity)
    case invalidGain(AppIdentity)
    case invalidDeviceUID(AppIdentity)
}

extension Profile {
    public func validate() throws {
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw ProfileValidationError.emptyName
        }
        guard revision > 0 else { throw ProfileValidationError.invalidRevision }

        var seen = Set<AppIdentity>()
        for rule in rules {
            guard !rule.app.bundleIdentifier.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                throw ProfileValidationError.invalidAppIdentity
            }
            guard seen.insert(rule.app).inserted else {
                throw ProfileValidationError.duplicateApp(rule.app)
            }
            guard rule.gain.isFinite, (0.0...1.0).contains(rule.gain) else {
                throw ProfileValidationError.invalidGain(rule.app)
            }
            if case let .device(uid) = rule.output,
               uid.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                throw ProfileValidationError.invalidDeviceUID(rule.app)
            }
        }
    }
}
