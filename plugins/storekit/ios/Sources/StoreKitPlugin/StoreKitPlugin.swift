import Foundation
import Capacitor
import StoreKit

/// StoreKit 2 bridge. The JS side (www/payments.js) owns every decision; this file only talks to Apple.
///
/// Contract (see src/index.d.ts):
///   canMakePayments()           -> { allowed }
///   products({ids})             -> { products: [...], invalid: [ids Apple did not return] }
///   purchase({id})              -> { status: success|pending|cancelled, productId, transactionId, originalTransactionId }
///   restore()                   -> { productIds }   (AppStore.sync(), then current entitlements)
///   entitlements()              -> { productIds }   (Transaction.currentEntitlements, verified, not revoked)
///   event "transactionUpdate"   -> { productId, transactionId, revoked }  (Transaction.updates)
///
/// Only verified transactions are ever trusted. Non-consumables stay in currentEntitlements after finish(), so the
/// entitlement list (not the purchase result) is what the app treats as the truth.
/// Never built in Xcode: the first Codemagic run is the first compile (see README, Known gaps).
@available(iOS 15.0, *)
@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "canMakePayments", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "entitlements", returnType: CAPPluginReturnPromise)
    ]

    private var updatesTask: Task<Void, Never>?

    override public func load() {
        // Must start as early as possible: Ask to Buy approvals, purchases finished on another device and
        // refunds arrive here, not in purchase().
        updatesTask = Task.detached { [weak self] in
            for await result in Transaction.updates {
                guard let self = self else { return }
                switch result {
                case .verified(let t):
                    await t.finish()
                    self.notifyListeners("transactionUpdate", data: [
                        "productId": t.productID,
                        "transactionId": String(t.id),
                        "revoked": t.revocationDate != nil
                    ])
                case .unverified:
                    break // never grant on an unverified transaction
                }
            }
        }
    }

    deinit { updatesTask?.cancel() }

    @objc func canMakePayments(_ call: CAPPluginCall) {
        call.resolve(["allowed": AppStore.canMakePayments])
    }

    @objc func products(_ call: CAPPluginCall) {
        guard let ids = call.getArray("ids", String.self), !ids.isEmpty else {
            return call.reject("ids required", "BAD_ARGS")
        }
        Task {
            do {
                let found = try await Product.products(for: ids)
                let have = Set(found.map { $0.id })
                let list: [[String: Any]] = found.map { p in
                    [
                        "id": p.id,
                        "displayName": p.displayName,
                        "description": p.description,
                        "displayPrice": p.displayPrice,
                        "price": NSDecimalNumber(decimal: p.price).stringValue,
                        "currencyCode": p.priceFormatStyle.currencyCode,
                        "type": StoreKitPlugin.typeName(p.type),
                        "isFamilyShareable": p.isFamilyShareable
                    ]
                }
                call.resolve(["products": list, "invalid": ids.filter { !have.contains($0) }])
            } catch {
                call.reject(error.localizedDescription, "PRODUCTS_FAILED")
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { return call.reject("id required", "BAD_ARGS") }
        Task {
            do {
                guard let product = try await Product.products(for: [id]).first else {
                    return call.reject("unknown product", "UNKNOWN_PRODUCT")
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let t):
                        await t.finish()
                        call.resolve([
                            "status": "success",
                            "productId": t.productID,
                            "transactionId": String(t.id),
                            "originalTransactionId": String(t.originalID)
                        ])
                    case .unverified(_, let err):
                        call.reject("verification failed: \(err.localizedDescription)", "UNVERIFIED")
                    }
                case .userCancelled:
                    call.resolve(["status": "cancelled", "productId": id])
                case .pending:
                    call.resolve(["status": "pending", "productId": id]) // Ask to Buy: a transactionUpdate follows if approved
                @unknown default:
                    call.reject("unknown purchase result", "UNKNOWN")
                }
            } catch {
                call.reject(error.localizedDescription, "PURCHASE_FAILED")
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync() // may show the Apple ID sign-in sheet; throws if the user cancels it
                call.resolve(["productIds": await StoreKitPlugin.currentEntitlementIds()])
            } catch {
                call.reject(error.localizedDescription, "RESTORE_FAILED")
            }
        }
    }

    @objc func entitlements(_ call: CAPPluginCall) {
        Task { call.resolve(["productIds": await StoreKitPlugin.currentEntitlementIds()]) }
    }

    private static func currentEntitlementIds() async -> [String] {
        var ids: [String] = []
        for await result in Transaction.currentEntitlements {
            if case .verified(let t) = result, t.revocationDate == nil, !ids.contains(t.productID) {
                ids.append(t.productID)
            }
        }
        return ids
    }

    private static func typeName(_ t: Product.ProductType) -> String {
        switch t {
        case .consumable: return "consumable"
        case .nonConsumable: return "nonConsumable"
        case .autoRenewable: return "autoRenewable"
        case .nonRenewable: return "nonRenewable"
        default: return "unknown"
        }
    }
}
