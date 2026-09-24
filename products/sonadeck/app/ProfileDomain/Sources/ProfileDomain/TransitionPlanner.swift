import Foundation

/// Values observed from the audio backend, rather than inferred from the selected profile.
public struct AudioObservation: Sendable {
    public let audioControlAuthorized: Bool
    public let defaultOutputUID: String?
    public let availableOutputUIDs: Set<String>
    public let runningApps: Set<AppIdentity>
    public let appliedRules: [AppIdentity: AppRule]

    public init(
        audioControlAuthorized: Bool,
        defaultOutputUID: String?,
        availableOutputUIDs: Set<String>,
        runningApps: Set<AppIdentity>,
        appliedRules: [AppIdentity: AppRule]
    ) {
        self.audioControlAuthorized = audioControlAuthorized
        self.defaultOutputUID = defaultOutputUID
        self.availableOutputUIDs = availableOutputUIDs
        self.runningApps = runningApps
        self.appliedRules = appliedRules
    }
}

public enum TransitionBlocker: Equatable, Sendable {
    case audioControlUnauthorized
    case defaultOutputUnavailable
    case outputDeviceUnavailable(uid: String)
}

public struct TransitionPlan: Sendable {
    public let profileID: UUID
    public let revision: UInt64
    public let releases: [AppIdentity]
    public let updates: [AppRule]
    public let pendingApps: [AppIdentity]

    public var isNoOp: Bool { releases.isEmpty && updates.isEmpty && pendingApps.isEmpty }
}

public enum PlanningError: Error, Equatable, Sendable {
    case invalidProfile(ProfileValidationError)
    case blocked([TransitionBlocker])
}

/// Produces an intent without specifying the order of audio resource operations.
public enum TransitionPlanner {
    public static func plan(profile: Profile, observed: AudioObservation) throws -> TransitionPlan {
        do {
            try profile.validate()
        } catch let error as ProfileValidationError {
            throw PlanningError.invalidProfile(error)
        }

        var blockers: [TransitionBlocker] = []
        if !observed.audioControlAuthorized && (!profile.rules.isEmpty || !observed.appliedRules.isEmpty) {
            blockers.append(.audioControlUnauthorized)
        }
        let defaultOutputAvailable = observed.defaultOutputUID.map {
            observed.availableOutputUIDs.contains($0)
        } ?? false
        if profile.rules.contains(where: { $0.output == .followSystem }) && !defaultOutputAvailable {
            blockers.append(.defaultOutputUnavailable)
        }
        let missingUIDs = Set(profile.rules.compactMap { rule -> String? in
            if case let .device(uid) = rule.output,
               !observed.availableOutputUIDs.contains(uid) { return uid }
            return nil
        })
        blockers += missingUIDs.sorted().map { .outputDeviceUnavailable(uid: $0) }
        guard blockers.isEmpty else { throw PlanningError.blocked(blockers) }

        let targetApps = Set(profile.rules.map(\.app))
        let releases = observed.appliedRules.keys
            .filter { !targetApps.contains($0) }
            .sorted { $0.bundleIdentifier < $1.bundleIdentifier }

        let pending = profile.rules
            .map(\.app)
            .filter { !observed.runningApps.contains($0) }

        let updates = profile.rules.compactMap { rule -> AppRule? in
            guard observed.runningApps.contains(rule.app), observed.appliedRules[rule.app] != rule else {
                return nil
            }
            return rule
        }

        return TransitionPlan(
            profileID: profile.id,
            revision: profile.revision,
            releases: releases,
            updates: updates,
            pendingApps: pending
        )
    }
}
