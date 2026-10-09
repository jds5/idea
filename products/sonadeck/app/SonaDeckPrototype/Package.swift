// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SonaDeckPrototype",
    platforms: [.macOS(.v15)],
    products: [.executable(name: "SonaDeckPrototype", targets: ["PrototypeUI"])],
    dependencies: [.package(path: "../ProfileDomain")],
    targets: [
        .target(name: "PrototypeModel", dependencies: [
            .product(name: "ProfileDomain", package: "ProfileDomain")]),
        .executableTarget(name: "PrototypeUI", dependencies: ["PrototypeModel",
            .product(name: "ProfileDomain", package: "ProfileDomain")]),
        .testTarget(name: "PrototypeModelTests", dependencies: ["PrototypeModel",
            .product(name: "ProfileDomain", package: "ProfileDomain")]),
    ]
)
