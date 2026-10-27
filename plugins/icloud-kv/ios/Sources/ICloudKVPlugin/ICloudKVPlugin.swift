import Foundation
import Capacitor

/// Thin bridge over NSUbiquitousKeyValueStore. Limits (Apple): 1 MB total, 1024 keys, 1 MB per value.
/// The JS side (www/save-adapter.js) chunks the save into <= 200 KB values and owns all conflict logic.
/// Needs the entitlement com.apple.developer.ubiquity-kvstore-identifier (scripts/patch-ios.mjs writes it)
/// and the iCloud > Key-value storage capability on the App ID (docs/TRACK-B.md).
@objc(ICloudKVPlugin)
public class ICloudKVPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ICloudKVPlugin"
    public let jsName = "ICloudKV"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "keys", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise)
    ]

    private let store = NSUbiquitousKeyValueStore.default

    override public func load() {
        NotificationCenter.default.addObserver(
            self, selector: #selector(externalChange(_:)),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification, object: store)
        store.synchronize()
    }

    @objc private func externalChange(_ note: Notification) {
        let changed = (note.userInfo?[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String]) ?? []
        notifyListeners("changed", data: ["keys": changed])
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        // ubiquityIdentityToken is nil when signed out of iCloud (or iCloud Drive/KVS is off for the app)
        call.resolve(["available": FileManager.default.ubiquityIdentityToken != nil])
    }

    @objc func get(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else { return call.reject("key required") }
        if let v = store.string(forKey: key) { call.resolve(["value": v]) } else { call.resolve(["value": NSNull()]) }
    }

    @objc func set(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), let value = call.getString("value") else { return call.reject("key and value required") }
        store.set(value, forKey: key)
        call.resolve()
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else { return call.reject("key required") }
        store.removeObject(forKey: key)
        call.resolve()
    }

    @objc func keys(_ call: CAPPluginCall) {
        call.resolve(["keys": Array(store.dictionaryRepresentation.keys)])
    }

    @objc func sync(_ call: CAPPluginCall) {
        store.synchronize()
        call.resolve()
    }
}
