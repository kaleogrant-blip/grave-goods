package com.gravegoods.playbilling

import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Google Play Billing bridge, same JS contract as the iOS StoreKit plugin (see src/index.d.ts):
 *   canMakePayments, products({ids}), purchase({id}), restore(), entitlements(), event "transactionUpdate".
 *
 * Rules: ownership is read from queryPurchasesAsync (state PURCHASED); a PURCHASED purchase is acknowledged
 * (else Play refunds it after 3 days); a purchase made outside purchase() (pending cleared, promo code redeemed
 * in the Play Store app) arrives through onPurchasesUpdated and is forwarded as "transactionUpdate".
 * Never built: the first Codemagic android-internal run is the first compile.
 */
@CapacitorPlugin(name = "PlayBilling")
class PlayBillingPlugin : Plugin(), PurchasesUpdatedListener {
    private var client: BillingClient? = null
    private var pendingCall: PluginCall? = null
    private var pendingId: String? = null
    private val details = mutableMapOf<String, ProductDetails>()

    override fun load() {
        // connect early so purchases that completed while the app was closed are reported at launch
        withClient(null) { }
    }

    /** Runs block with a connected client, or rejects call (when given). */
    private fun withClient(call: PluginCall?, block: (BillingClient) -> Unit) {
        val c = client ?: BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build().also { client = it }
        if (c.isReady) { block(c); return }
        c.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(r: BillingResult) {
                if (r.responseCode == BillingClient.BillingResponseCode.OK) block(c)
                else call?.reject(r.debugMessage, "BILLING_UNAVAILABLE")
            }
            override fun onBillingServiceDisconnected() { /* auto reconnection is on */ }
        })
    }

    private fun queryDetails(c: BillingClient, ids: List<String>, done: (List<ProductDetails>, List<String>) -> Unit) {
        val list = ids.map {
            QueryProductDetailsParams.Product.newBuilder().setProductId(it).setProductType(BillingClient.ProductType.INAPP).build()
        }
        c.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(list).build()) { r, result ->
            if (r.responseCode != BillingClient.BillingResponseCode.OK) { done(emptyList(), ids); return@queryProductDetailsAsync }
            val found = result.productDetailsList
            found.forEach { details[it.productId] = it }
            done(found, ids.filter { id -> found.none { it.productId == id } })
        }
    }

    @PluginMethod
    fun canMakePayments(call: PluginCall) {
        withClient(null) { }
        val ok = client?.isFeatureSupported(BillingClient.FeatureType.PRODUCT_DETAILS)?.responseCode
        call.resolve(JSObject().put("allowed", ok == null || ok == BillingClient.BillingResponseCode.OK))
    }

    @PluginMethod
    fun products(call: PluginCall) {
        val ids = call.getArray("ids")?.toList<String>()
        if (ids.isNullOrEmpty()) { call.reject("ids required", "BAD_ARGS"); return }
        withClient(call) { c ->
            queryDetails(c, ids) { found, invalid ->
                val arr = JSArray()
                found.forEach { d ->
                    val o = d.oneTimePurchaseOfferDetails
                    arr.put(JSObject()
                        .put("id", d.productId)
                        .put("displayName", d.name)
                        .put("description", d.description)
                        .put("displayPrice", o?.formattedPrice ?: "")
                        .put("price", if (o != null) (o.priceAmountMicros / 1_000_000.0).toBigDecimal().setScale(2, java.math.RoundingMode.HALF_UP).toPlainString() else "")
                        .put("currencyCode", o?.priceCurrencyCode ?: "")
                        .put("type", "nonConsumable")
                        .put("isFamilyShareable", false))
                }
                call.resolve(JSObject().put("products", arr).put("invalid", JSArray(invalid)))
            }
        }
    }

    @PluginMethod
    fun purchase(call: PluginCall) {
        val id = call.getString("id")
        if (id == null) { call.reject("id required", "BAD_ARGS"); return }
        if (pendingCall != null) { call.reject("another purchase is in progress", "BUSY"); return }
        val act = activity
        if (act == null) { call.reject("no activity", "NO_ACTIVITY"); return }
        withClient(call) { c ->
            val launch = { d: ProductDetails ->
                val p = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d).build()
                val flow = BillingFlowParams.newBuilder().setProductDetailsParamsList(listOf(p)).build()
                pendingCall = call; pendingId = id
                val r = c.launchBillingFlow(act, flow)
                if (r.responseCode != BillingClient.BillingResponseCode.OK) {
                    pendingCall = null; pendingId = null
                    call.reject(r.debugMessage, "PURCHASE_FAILED")
                }
            }
            val cached = details[id]
            if (cached != null) launch(cached)
            else queryDetails(c, listOf(id)) { found, _ ->
                if (found.isEmpty()) call.reject("unknown product", "UNKNOWN_PRODUCT") else launch(found[0])
            }
        }
    }

    override fun onPurchasesUpdated(r: BillingResult, purchases: MutableList<Purchase>?) {
        val call = pendingCall; val id = pendingId
        pendingCall = null; pendingId = null
        when (r.responseCode) {
            BillingClient.BillingResponseCode.OK -> purchases?.forEach { p ->
                val mine = call != null && p.products.contains(id)
                when (p.purchaseState) {
                    Purchase.PurchaseState.PURCHASED -> acknowledge(p) {
                        if (mine) call?.resolve(result("success", p)) else forward(p)
                    }
                    Purchase.PurchaseState.PENDING -> if (mine) call?.resolve(JSObject().put("status", "pending").put("productId", id))
                    else -> {}
                }
            }
            BillingClient.BillingResponseCode.USER_CANCELED ->
                call?.resolve(JSObject().put("status", "cancelled").put("productId", id))
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED ->
                call?.resolve(JSObject().put("status", "success").put("productId", id)) // JS then reads entitlements() as the truth
            else -> call?.reject(r.debugMessage, "PURCHASE_FAILED")
        }
    }

    private fun result(status: String, p: Purchase) = JSObject()
        .put("status", status)
        .put("productId", p.products.firstOrNull() ?: "")
        .put("transactionId", p.orderId ?: "")

    private fun forward(p: Purchase) {
        notifyListeners("transactionUpdate", JSObject()
            .put("productId", p.products.firstOrNull() ?: "")
            .put("transactionId", p.orderId ?: "")
            .put("revoked", false))
    }

    private fun acknowledge(p: Purchase, then: () -> Unit) {
        val c = client
        if (p.isAcknowledged || c == null) { then(); return }
        c.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.purchaseToken).build()) { then() }
    }

    private fun queryOwned(call: PluginCall) {
        withClient(call) { c ->
            c.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()) { r, list ->
                if (r.responseCode != BillingClient.BillingResponseCode.OK) { call.reject(r.debugMessage, "QUERY_FAILED"); return@queryPurchasesAsync }
                val owned = list.filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
                owned.filter { !it.isAcknowledged }.forEach { acknowledge(it) { } } // a purchase made while the app was closed
                val ids = JSArray()
                owned.flatMap { it.products }.distinct().forEach { ids.put(it) }
                call.resolve(JSObject().put("productIds", ids))
            }
        }
    }

    @PluginMethod
    fun entitlements(call: PluginCall) = queryOwned(call)

    @PluginMethod
    fun restore(call: PluginCall) = queryOwned(call)
}
