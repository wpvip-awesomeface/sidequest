import Foundation
import Security

// Credentials travel over stdin/stdout, never process arguments or the game save.
let input = FileHandle.standardInput.readDataToEndOfFile()
do {
    guard let request = try JSONSerialization.jsonObject(with: input) as? [String: String],
          let account = request["account"], (account.hasPrefix("linear:") || account.hasPrefix("google:")),
          let operation = request["operation"] else { throw NSError(domain: "Sidequest", code: 1) }
    let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: "local.sidequest.connections", kSecAttrAccount as String: account]
    var status: OSStatus = errSecSuccess
    var result: [String: Any] = ["value": NSNull()]
    switch operation {
    case "get":
        var read = query
        read[kSecReturnData as String] = true
        read[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        status = SecItemCopyMatching(read as CFDictionary, &item)
        if let data = item as? Data { result["value"] = String(data: data, encoding: .utf8) }
    case "set":
        guard let value = request["value"], !value.isEmpty else { throw NSError(domain: "Sidequest", code: 2) }
        let data = Data(value.utf8)
        status = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if status == errSecItemNotFound {
            var add = query
            add[kSecValueData as String] = data
            status = SecItemAdd(add as CFDictionary, nil)
        }
    case "delete": status = SecItemDelete(query as CFDictionary)
    default: throw NSError(domain: "Sidequest", code: 3)
    }
    guard status == errSecSuccess || (status == errSecItemNotFound && operation != "set") else {
        throw NSError(domain: NSOSStatusErrorDomain, code: Int(status))
    }
    FileHandle.standardOutput.write(try JSONSerialization.data(withJSONObject: result))
} catch {
    FileHandle.standardError.write(Data("macOS Keychain could not complete the request.\n".utf8))
    exit(1)
}
