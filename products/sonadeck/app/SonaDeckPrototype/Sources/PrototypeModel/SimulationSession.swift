import Foundation
import ProfileDomain

public struct SimulationSession: Sendable {
    public static let music = AppIdentity(bundleIdentifier: "com.example.music")
    public static let browser = AppIdentity(bundleIdentifier: "com.example.browser")
    public static let meeting = AppIdentity(bundleIdentifier: "com.example.meeting")
    public static let apps = [music, browser, meeting]
    public static let names = ["Music", "Browser", "Meeting"]

    public private(set) var profiles: [Profile]
    public private(set) var targetID: UUID?
    public private(set) var actualID: UUID?
    public private(set) var applied: [AppIdentity: AppRule] = [:]
    public private(set) var draft: [AppRule] = []
    public private(set) var pending: [AppIdentity] = []
    public private(set) var message = "请选择一套配置。尚未应用任何模拟规则。"
    public private(set) var failed = false
    public private(set) var modified = false
    private var drafts: [UUID: [AppRule]] = [:]
    public var authorized = true
    public var usbConnected = true
    public var meetingRunning = true
    public var failNextApply = false

    public init() {
        func rule(_ app: AppIdentity, _ gain: Double, _ muted: Bool = false,
                  _ output: OutputTarget = .followSystem) -> AppRule {
            AppRule(app: app, gain: gain, muted: muted, output: output)
        }
        profiles = [
            Profile(id: UUID(), name: "工作", revision: 1, rules: [
                rule(Self.music, 0.4), rule(Self.browser, 0.6)]),
            Profile(id: UUID(), name: "会议", revision: 1, rules: [
                rule(Self.browser, 0.2, true), rule(Self.meeting, 0.8)]),
            Profile(id: UUID(), name: "音乐", revision: 1, rules: [
                rule(Self.music, 0.7, false, .device(uid: "usb")), rule(Self.browser, 0.2)]),
            Profile(id: UUID(), name: "夜间", revision: 1, rules: [
                rule(Self.music, 0.15), rule(Self.browser, 0.1)]),
        ]
    }

    public func name(for id: UUID?) -> String {
        profiles.first(where: { $0.id == id })?.name ?? "无"
    }

    public func rule(for app: AppIdentity) -> AppRule? { draft.first { $0.app == app } }

    public var canRestoreDraft: Bool {
        guard let id = targetID, let savedDraft = drafts[id] else { return false }
        return savedDraft != draft
    }

    public mutating func restoreDraft() {
        guard let id = targetID, let savedDraft = drafts[id] else { return }
        draft = savedDraft
        modified = draft != profiles.first(where: { $0.id == id })?.rules
        failed = false
        message = "已恢复草稿，尚未应用；当前模拟实际状态保持不变。"
    }

    public mutating func select(_ id: UUID) {
        guard let profile = profiles.first(where: { $0.id == id }) else { return }
        targetID = id
        draft = profile.rules
        modified = false
        apply(profile)
    }

    public mutating func retry() {
        guard let id = targetID else { return }
        let target = Profile(id: id, name: name(for: id), revision: 1, rules: draft)
        apply(target)
    }

    public mutating func edit(_ app: AppIdentity, gain: Double? = nil,
                              muted: Bool? = nil, output: OutputTarget? = nil) {
        guard let index = draft.firstIndex(where: { $0.app == app }) else { return }
        let old = draft[index]
        draft[index] = AppRule(app: app, gain: gain ?? old.gain,
                              muted: muted ?? old.muted, output: output ?? old.output)
        modified = true
        if let id = targetID { drafts[id] = draft }
        message = "草稿已修改，尚未应用或保存。"
        failed = false
    }

    public mutating func saveCopy() {
        guard targetID != nil else { return }
        let copy = Profile(id: UUID(), name: "自定义 \(profiles.count - 3)", revision: 1, rules: draft)
        do {
            try copy.validate()
            profiles.append(copy)
            targetID = copy.id
            modified = false
            message = "已另存为会话内配置；重启后不保留。尚未应用新配置。"
            failed = false
        } catch {
            message = "保存失败：草稿包含无效规则。"
            failed = true
        }
    }

    private mutating func apply(_ profile: Profile) {
        var running = Set([Self.music, Self.browser])
        if meetingRunning { running.insert(Self.meeting) }
        let observation = AudioObservation(
            audioControlAuthorized: authorized, defaultOutputUID: "built-in",
            availableOutputUIDs: usbConnected ? ["built-in", "usb"] : ["built-in"],
            runningApps: running, appliedRules: applied)
        do {
            let plan = try TransitionPlanner.plan(profile: profile, observed: observation)
            if failNextApply {
                failNextApply = false
                failed = true
                message = "模拟执行失败：未修改任何规则。修复后可重试。"
                return
            }
            // Fake backend only: this in-memory commit is NOT a system audio transaction.
            for app in plan.releases { applied.removeValue(forKey: app) }
            for rule in plan.updates { applied[rule.app] = rule }
            pending = plan.pendingApps
            let matchesSaved = profiles.first(where: { $0.id == profile.id })?.rules == profile.rules
            actualID = pending.isEmpty && matchesSaved ? profile.id : nil
            failed = false
            message = pending.isEmpty
                ? (plan.isNoOp ? "模拟状态已一致，无需重复执行。" : "已应用到模拟后端，真实音频未改变。")
                : "已应用可执行规则；\(pending.count) 个应用未运行，整套配置尚未完全生效。"
        } catch let PlanningError.blocked(blockers) {
            failed = true
            let descriptions = blockers.map { blocker in
                switch blocker {
                case .audioControlUnauthorized: "模拟权限未授权"
                case .defaultOutputUnavailable: "模拟系统输出不可用"
                case .outputDeviceUnavailable: "模拟 USB DAC 未连接"
                }
            }
            message = "切换被阻止：" + descriptions.joined(separator: "；") + "。原有模拟规则保持不变。"
        } catch {
            failed = true
            message = "规则无效，未修改模拟状态。"
        }
    }
}
