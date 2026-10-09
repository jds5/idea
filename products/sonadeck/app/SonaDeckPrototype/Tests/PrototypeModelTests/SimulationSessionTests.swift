import XCTest
import ProfileDomain
@testable import PrototypeModel

final class SimulationSessionTests: XCTestCase {
    func testTwentyRoundTripsReleaseOldOwnership() {
        var session = SimulationSession()
        for _ in 0..<20 {
            session.select(session.profiles[0].id)
            XCTAssertEqual(Set(session.applied.keys), [SimulationSession.music, SimulationSession.browser])
            session.select(session.profiles[1].id)
            XCTAssertEqual(Set(session.applied.keys), [SimulationSession.meeting, SimulationSession.browser])
            XCTAssertEqual(session.actualID, session.profiles[1].id)
        }
    }

    func testMissingDeviceKeepsActualConfigurationAndRules() {
        var session = SimulationSession()
        session.select(session.profiles[0].id)
        let before = session.applied
        session.usbConnected = false
        session.select(session.profiles[2].id)
        XCTAssertTrue(session.failed)
        XCTAssertEqual(session.targetID, session.profiles[2].id)
        XCTAssertEqual(session.actualID, session.profiles[0].id)
        XCTAssertEqual(session.applied, before)
        session.usbConnected = true
        session.retry()
        XCTAssertFalse(session.failed)
        XCTAssertEqual(session.actualID, session.targetID)
    }

    func testPermissionDeniedAndExecutionFailureNeverReportSuccess() {
        var session = SimulationSession()
        session.select(session.profiles[0].id)
        let before = session.applied
        session.authorized = false
        session.select(session.profiles[1].id)
        XCTAssertTrue(session.failed)
        XCTAssertEqual(session.applied, before)
        session.authorized = true
        session.failNextApply = true
        session.retry()
        XCTAssertTrue(session.failed)
        XCTAssertEqual(session.applied, before)
        XCTAssertEqual(session.actualID, session.profiles[0].id)
        session.retry()
        XCTAssertFalse(session.failed)
        XCTAssertEqual(session.actualID, session.profiles[1].id)
    }

    func testPendingApplicationDoesNotClaimCompleteAndCanRetry() {
        var session = SimulationSession()
        session.meetingRunning = false
        session.select(session.profiles[1].id)
        XCTAssertNil(session.actualID)
        XCTAssertEqual(session.pending, [SimulationSession.meeting])
        XCTAssertNil(session.applied[SimulationSession.meeting])
        session.meetingRunning = true
        session.retry()
        XCTAssertTrue(session.pending.isEmpty)
        XCTAssertEqual(session.actualID, session.targetID)
    }

    func testDraftIsSeparateFromObservedAndSurvivesSwitching() {
        var session = SimulationSession()
        session.select(session.profiles[0].id)
        let before = session.applied
        session.edit(SimulationSession.music, gain: 0.23, muted: true)
        XCTAssertEqual(session.applied, before)
        XCTAssertTrue(session.modified)
        session.select(session.profiles[1].id)
        session.select(session.profiles[0].id)
        XCTAssertEqual(session.rule(for: SimulationSession.music)?.gain, 0.4)
        XCTAssertEqual(session.applied, before, "Selecting a preset must apply its saved contents")
        XCTAssertFalse(session.modified)
        XCTAssertTrue(session.canRestoreDraft)
        session.restoreDraft()
        XCTAssertEqual(session.rule(for: SimulationSession.music)?.gain, 0.23)
        XCTAssertTrue(session.modified)
        XCTAssertEqual(session.applied, before, "Restoring a draft must not apply it")
        session.retry()
        XCTAssertNil(session.actualID, "Modified draft must not claim to match saved preset")
    }

    func testSaveCopyKeepsOriginalAndDoesNotApply() {
        var session = SimulationSession()
        session.select(session.profiles[0].id)
        let original = session.profiles[0]
        let before = session.applied
        session.edit(SimulationSession.music, gain: 0.3)
        session.saveCopy()
        XCTAssertEqual(session.profiles.count, 5)
        XCTAssertEqual(session.profiles[0], original)
        XCTAssertEqual(session.applied, before)
        XCTAssertNotEqual(session.targetID, session.actualID)
        session.retry()
        XCTAssertEqual(session.targetID, session.actualID)
        XCTAssertEqual(session.applied[SimulationSession.music]?.gain, 0.3)
    }

    func testInvalidDraftCannotBeSavedOrApplied() {
        var session = SimulationSession()
        session.select(session.profiles[0].id)
        let before = session.applied
        session.edit(SimulationSession.music, gain: 2)
        session.saveCopy()
        XCTAssertTrue(session.failed)
        XCTAssertEqual(session.profiles.count, 4)
        session.retry()
        XCTAssertTrue(session.failed)
        XCTAssertEqual(session.applied, before)
    }

    func testCodableRoundTripPreservesConfiguration() throws {
        let profiles = SimulationSession().profiles
        let encoded = try JSONEncoder().encode(profiles)
        XCTAssertEqual(try JSONDecoder().decode([Profile].self, from: encoded), profiles)
    }
}
