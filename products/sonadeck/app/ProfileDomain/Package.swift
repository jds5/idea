// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "ProfileDomain",
    platforms: [.macOS(.v15)],
    products: [.library(name: "ProfileDomain", targets: ["ProfileDomain"])],
    targets: [
        .target(name: "ProfileDomain"),
        .testTarget(name: "ProfileDomainTests", dependencies: ["ProfileDomain"]),
    ]
)
