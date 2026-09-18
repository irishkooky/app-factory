// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "LoxoninCore",
    platforms: [.iOS(.v17), .macOS(.v13)],
    products: [.library(name: "LoxoninCore", targets: ["LoxoninCore"])],
    targets: [
        .target(name: "LoxoninCore"),
        .executableTarget(name: "CoreChecks", dependencies: ["LoxoninCore"]),
        .testTarget(name: "LoxoninCoreTests", dependencies: ["LoxoninCore"]),
    ]
)
