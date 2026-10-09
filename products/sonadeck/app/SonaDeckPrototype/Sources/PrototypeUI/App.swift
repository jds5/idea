#if os(macOS)
import SwiftUI
import AppKit
import PrototypeModel
import ProfileDomain

@main
struct SonaDeckPrototypeApp: App {
    var body: some Scene {
        WindowGroup("SonaDeck · 测试原型") {
            PrototypeView()
        }
        .defaultSize(width: 820, height: 660)
    }
}

struct PrototypeView: View {
    @State private var session = SimulationSession()

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "slider.horizontal.3").font(.title)
                VStack(alignment: .leading) {
                    Text("SonaDeck").font(.title2.bold())
                    Text("模拟音频后端 · 不控制系统声音").foregroundStyle(.secondary)
                }
                Spacer()
                Text("测试原型").font(.caption.bold()).padding(8)
                    .background(.orange.opacity(0.15), in: Capsule())
            }
            ScrollView(.horizontal) {
                HStack {
                    ForEach(session.profiles, id: \.id) { profile in
                        Button { session.select(profile.id) } label: {
                            Label(profile.name, systemImage: session.targetID == profile.id ? "checkmark.circle" : "circle")
                        }
                        .buttonStyle(.bordered)
                        .tint(session.targetID == profile.id ? .accentColor : nil)
                        .accessibilityLabel("切换到\(profile.name)")
                    }
                }
            }
            .frame(height: 36)
            HStack {
                Text("目标：\(session.name(for: session.targetID))\(session.modified ? " · 已修改" : "")")
                Spacer()
                Text("模拟完整生效：\(session.name(for: session.actualID))").foregroundStyle(.secondary)
            }
            Label(session.message, systemImage: session.failed ? "exclamationmark.triangle" : "info.circle")
                .foregroundStyle(session.failed ? Color.orange : Color.secondary)
                .frame(maxWidth: .infinity, alignment: .leading).padding(12)
                .background(.quaternary, in: RoundedRectangle(cornerRadius: 8))
                .accessibilityIdentifier("transition-status")
            Divider()
            Group {
            if session.targetID == nil {
                ContentUnavailableView("尚未选择配置", systemImage: "slider.horizontal.3",
                                       description: Text("选择上方配置，查看应用规则和模拟切换结果。"))
            } else {
                VStack(spacing: 16) {
                    ForEach(Array(SimulationSession.apps.enumerated()), id: \.offset) { index, app in
                        if let rule = session.rule(for: app) {
                            HStack(spacing: 12) {
                                Text(SimulationSession.names[index]).frame(width: 70, alignment: .leading)
                                Toggle("静音", isOn: Binding(get: { rule.muted }, set: { session.edit(app, muted: $0) }))
                                    .toggleStyle(.checkbox)
                                    .accessibilityLabel("\(SimulationSession.names[index]) 静音")
                                Slider(value: Binding(get: { rule.gain }, set: { session.edit(app, gain: $0) }), in: 0...1)
                                    .accessibilityLabel("\(SimulationSession.names[index]) 音量")
                                Text("\(Int(rule.gain * 100))%").monospacedDigit().frame(width: 42)
                                Picker("输出", selection: Binding<String>(
                                    get: { rule.output == .followSystem ? "system" : "usb" },
                                    set: { session.edit(app, output: $0 == "system" ? .followSystem : .device(uid: "usb")) })) {
                                    Text("跟随系统").tag("system")
                                    Text("USB DAC（模拟）").tag("usb")
                                }.labelsHidden().frame(width: 160)
                                    .accessibilityLabel("\(SimulationSession.names[index]) 输出设备")
                            }
                        }
                    }
                }
            }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            HStack {
                Button("应用草稿 / 重试") { session.retry() }.disabled(session.targetID == nil)
                    .keyboardShortcut(.return, modifiers: [.command])
                Button("另存为配置") { session.saveCopy() }.disabled(session.targetID == nil)
                Button("恢复草稿") { session.restoreDraft() }.disabled(!session.canRestoreDraft)
                Spacer()
                Text("仅保存在当前会话").font(.caption).foregroundStyle(.secondary)
            }
            Divider()
            GroupBox("测试环境（模拟）") {
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Toggle("音频权限", isOn: $session.authorized)
                        Toggle("USB DAC 已连接", isOn: $session.usbConnected)
                        Toggle("会议应用运行中", isOn: $session.meetingRunning)
                    }
                    Toggle("下次执行注入失败", isOn: $session.failNextApply)
                    Text("修改测试条件后，点击配置或重试。此原型不测试真实权限、设备热插拔或崩溃恢复。")
                        .font(.caption).foregroundStyle(.secondary)
                }.toggleStyle(.checkbox).padding(6)
            }
            Text("实际模拟规则：\(session.applied.count) 项 · 待生效：\(session.pending.count) 项")
                .font(.caption).foregroundStyle(.secondary)
        }
        .padding(20)
        .frame(minWidth: 760, minHeight: 640, alignment: .topLeading)
    }
}
#else
import Foundation
@main
struct UnsupportedPlatform {
    static func main() {
        print("SonaDeckPrototype UI requires macOS 15+. Linux supports model tests only.")
    }
}
#endif
