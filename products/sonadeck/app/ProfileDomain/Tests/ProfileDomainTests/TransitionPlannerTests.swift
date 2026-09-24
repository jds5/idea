import XCTest
@testable import ProfileDomain

final class TransitionPlannerTests: XCTestCase {
    private let music = AppIdentity(bundleIdentifier: "com.example.music")
    private let meeting = AppIdentity(bundleIdentifier: "com.example.meeting")

    private func rule(_ app: AppIdentity, gain: Double = 1, muted: Bool = false,
                      output: OutputTarget = .followSystem) -> AppRule {
        AppRule(app: app, gain: gain, muted: muted, output: output)
    }

    private func profile(_ rules: [AppRule]) -> Profile {
        Profile(id: UUID(), name: "Work", revision: 1, rules: rules)
    }

    private func observation(
        devices: Set<String> = ["built-in", "usb"],
        running: Set<AppIdentity> = [],
        applied: [AppIdentity: AppRule] = [:],
        authorized: Bool = true
    ) -> AudioObservation {
        AudioObservation(audioControlAuthorized: authorized, defaultOutputUID: "built-in",
                         availableOutputUIDs: devices, runningApps: running, appliedRules: applied)
    }

    func testReleasesOldRuleAndAppliesNewRule() throws {
        let old = rule(music, gain: 0.2, muted: true, output: .device(uid: "usb"))
        let new = rule(meeting, gain: 0.7)
        let plan = try TransitionPlanner.plan(
            profile: profile([new]),
            observed: observation(running: [meeting], applied: [music: old])
        )
        XCTAssertEqual(plan.releases, [music])
        XCTAssertEqual(plan.updates, [new])
        XCTAssertTrue(plan.pendingApps.isEmpty)
    }

    func testMissingDeviceBlocksWholePlanIncludingReleases() throws {
        let old = rule(music)
        let target = profile([rule(meeting, output: .device(uid: "missing"))])
        XCTAssertThrowsError(try TransitionPlanner.plan(
            profile: target, observed: observation(applied: [music: old])
        )) { error in
            XCTAssertEqual(error as? PlanningError, .blocked([.outputDeviceUnavailable(uid: "missing")]))
        }
    }

    func testAbsentAppStaysPendingAndIsNotApplied() throws {
        let target = profile([rule(meeting, gain: 0.5)])
        let plan = try TransitionPlanner.plan(profile: target, observed: observation())
        XCTAssertEqual(plan.pendingApps, [meeting])
        XCTAssertTrue(plan.releases.isEmpty)
        XCTAssertTrue(plan.updates.isEmpty)
        XCTAssertFalse(plan.isNoOp)
    }

    func testRepeatedSelectionWithMatchingObservedRulesIsNoOp() throws {
        let current = rule(music, gain: 0.4, output: .device(uid: "usb"))
        let plan = try TransitionPlanner.plan(
            profile: profile([current]),
            observed: observation(running: [music], applied: [music: current])
        )
        XCTAssertTrue(plan.isNoOp)
    }

    func testUnauthorizedControlBlocksPlan() throws {
        XCTAssertThrowsError(try TransitionPlanner.plan(
            profile: profile([rule(music)]), observed: observation(authorized: false)
        )) { error in
            XCTAssertEqual(error as? PlanningError, .blocked([.audioControlUnauthorized]))
        }
    }

    func testEmptyProfileReleasesAllPreviouslyControlledApps() throws {
        let plan = try TransitionPlanner.plan(
            profile: profile([]),
            observed: observation(applied: [meeting: rule(meeting), music: rule(music)])
        )
        XCTAssertEqual(plan.releases, [meeting, music])
        XCTAssertTrue(plan.updates.isEmpty)
    }

    func testUnavailableSystemOutputBlocksFollowSystemRule() throws {
        let observed = AudioObservation(
            audioControlAuthorized: true, defaultOutputUID: nil,
            availableOutputUIDs: ["usb"], runningApps: [music], appliedRules: [:]
        )
        XCTAssertThrowsError(try TransitionPlanner.plan(
            profile: profile([rule(music)]), observed: observed
        )) { error in
            XCTAssertEqual(error as? PlanningError, .blocked([.defaultOutputUnavailable]))
        }
    }

    func testInvalidGainAndDuplicateIdentityAreRejected() throws {
        let invalid = profile([rule(music, gain: .nan)])
        XCTAssertThrowsError(try invalid.validate()) { error in
            XCTAssertEqual(error as? ProfileValidationError, .invalidGain(music))
        }
        let duplicate = profile([rule(music), rule(music, muted: true)])
        XCTAssertThrowsError(try duplicate.validate()) { error in
            XCTAssertEqual(error as? ProfileValidationError, .duplicateApp(music))
        }
    }
}
