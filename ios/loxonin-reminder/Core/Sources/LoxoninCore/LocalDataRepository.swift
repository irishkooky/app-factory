import Foundation

public enum LocalDataError: Error, Equatable {
    case unsupportedSchema(Int)
    case invalidSettings
    case writesBlocked
}

public final class LocalDataRepository {
    public let fileURL: URL
    public private(set) var writesAreBlocked = false

    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    public init(fileURL: URL) {
        self.fileURL = fileURL
        decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    }

    public func load() throws -> StoredAppData {
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            return StoredAppData()
        }
        do {
            let data = try Data(contentsOf: fileURL)
            let stored = try decoder.decode(StoredAppData.self, from: data)
            guard stored.schemaVersion == StoredAppData.currentSchemaVersion else {
                throw LocalDataError.unsupportedSchema(stored.schemaVersion)
            }
            guard stored.settings.isValid else { throw LocalDataError.invalidSettings }
            writesAreBlocked = false
            return stored
        } catch {
            writesAreBlocked = true
            throw error
        }
    }

    public func save(_ data: StoredAppData) throws {
        guard !writesAreBlocked else { throw LocalDataError.writesBlocked }
        guard data.schemaVersion == StoredAppData.currentSchemaVersion else {
            throw LocalDataError.unsupportedSchema(data.schemaVersion)
        }
        guard data.settings.isValid else { throw LocalDataError.invalidSettings }
        try FileManager.default.createDirectory(
            at: fileURL.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        try encoder.encode(data).write(to: fileURL, options: .atomic)
    }

    public func reset() throws {
        writesAreBlocked = false
        do {
            try save(StoredAppData())
        } catch {
            writesAreBlocked = true
            throw error
        }
    }
}
