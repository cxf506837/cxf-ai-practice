package com.ribboninbox.app

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.webkit.WebView
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject
import java.net.URI

class NativeBridge(private val activity: Activity, private val captures: PendingCaptureStore, private val documents: BackupDocuments, private val cloud: CloudAi, private val images: ImageDocuments) {
    fun register(browser: WebView): Boolean {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return false
        WebViewCompat.addWebMessageListener(browser, "RibbonNative", setOf(AssetRoutes.ORIGIN)) { _, message, origin, mainFrame, proxy ->
            if (!mainFrame || origin.toString() != AssetRoutes.ORIGIN) return@addWebMessageListener
            val raw = message.data ?: return@addWebMessageListener
            if (raw.length > BackupDocuments.LIMIT * 3) return@addWebMessageListener
            var id = ""
            fun reply(result: JSONObject) { if (!activity.isDestroyed) proxy.postMessage(JSONObject().put("requestId", id).put("result", result).toString()) }
            fun failure(code: String, text: String) = JSONObject().put("ok", false).put("code", code).put("message", text)
            fun success(value: Any = JSONObject.NULL) = JSONObject().put("ok", true).put("value", value)
            try {
                val request = JSONObject(raw)
                id = request.get("requestId") as String
                require(id.length <= 100 && request.get("version") == 1)
                val operation = request.get("operation") as String
                val payload = request.getJSONObject("payload")
                require(operation == "backupExport" || operation == "cloudRecognize" && raw.length <= AiPolicy.IMAGE_LIMIT * 4 / 3 + 1000 || raw.length <= 1024 * 1024)
                when (operation) {
                    "ready" -> reply(success(captures.all()))
                    "ackCapture" -> { val captureId = payload.get("captureId") as String; require(captureId.length <= 100); captures.acknowledge(captureId); reply(success()) }
                    "openExternal" -> {
                        val url = payload.get("url") as String; require(url.length <= 4096)
                        val uri = URI(url); require(uri.scheme in listOf("http", "https") && uri.host != null && uri.userInfo == null)
                        try { activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE)); reply(success()) }
                        catch (_: Exception) { reply(failure("EXTERNAL_OPEN_FAILED", "没有可用浏览器，请复制链接")) }
                    }
                    "backupExport" -> documents.choose(payload.get("json") as String) { reply(it) }
                    "backupImport" -> documents.choose(null) { reply(it) }
                    "cloudConfigure" -> cloud.configure { reply(it) }
                    "imagePick" -> images.choose { reply(it) }
                    "cloudOrganize" -> cloud.run("organize",payload) { reply(it) }
                    "cloudRecognize" -> cloud.run("recognize",payload) { reply(it) }
                    "cloudAsk" -> cloud.run("ask",payload) { reply(it) }
                    "cloudCancel" -> { cloud.cancel(); reply(success()) }
                    "exit" -> { reply(success()); activity.finish() }
                    else -> reply(failure("VALIDATION", "不支持的操作"))
                }
            } catch (_: Exception) { reply(failure("VALIDATION", "操作未完成，消息格式无效或本地存储不可用")) }
        }
        return true
    }
}
