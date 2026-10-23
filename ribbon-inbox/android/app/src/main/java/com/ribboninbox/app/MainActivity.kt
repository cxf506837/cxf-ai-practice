package com.ribboninbox.app

import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.WindowInsets
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.RenderProcessGoneDetail
import android.widget.FrameLayout
import java.io.ByteArrayInputStream
import java.io.IOException

class MainActivity : Activity() {
    private lateinit var browser: WebView
    private lateinit var captures: PendingCaptureStore
    private lateinit var documents: BackupDocuments
    private lateinit var cloud: CloudAi
    private lateinit var images: ImageDocuments
    private var bridgeSupported = false
    private var keyboardVisible = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        captures = PendingCaptureStore(this)
        documents = BackupDocuments(this)
        cloud = CloudAi(this)
        images = ImageDocuments(this)
        if (savedInstanceState == null) acceptShare(intent)
        browser = WebView(this)
        browser.setBackgroundColor(Color.rgb(11, 10, 16))
        val container = FrameLayout(this)
        container.addView(browser, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        container.setOnApplyWindowInsetsListener { view, insets ->
            if (Build.VERSION.SDK_INT >= 30) {
                val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
                val keyboard = insets.getInsets(WindowInsets.Type.ime())
                keyboardVisible = insets.isVisible(WindowInsets.Type.ime())
                view.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, keyboard.bottom))
            } else {
                @Suppress("DEPRECATION")
                view.setPadding(insets.systemWindowInsetLeft, insets.systemWindowInsetTop, insets.systemWindowInsetRight, insets.systemWindowInsetBottom)
            }
            insets
        }
        setContentView(container)
        container.requestApplyInsets()
        browser.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportMultipleWindows(false)
            textZoom = (resources.configuration.fontScale * 100).toInt()
            builtInZoomControls = true
            displayZoomControls = false
        }
        WebView.setWebContentsDebuggingEnabled(applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0)
        bridgeSupported = NativeBridge(this, captures, documents, cloud, images).register(browser)
        browser.webViewClient = object : WebViewClient() {
            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                view.destroy()
                AlertDialog.Builder(this@MainActivity).setTitle("页面需要重新打开")
                    .setMessage("本地收藏保留，请重新打开应用继续。")
                    .setPositiveButton("重新打开") { _, _ -> recreate() }.setNegativeButton("关闭") { _, _ -> finish() }.show()
                return true
            }
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                AssetRoutes.resolve(request.url.toString()) == null

            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse {
                val asset = AssetRoutes.resolve(request.url.toString())
                if (asset == null || request.method != "GET") return errorResponse(403, "Forbidden")
                val mime = when (asset.substringAfterLast('.')) {
                    "html" -> "text/html"
                    "js" -> "text/javascript"
                    "css" -> "text/css"
                    "svg" -> "image/svg+xml"
                    "ico" -> "image/x-icon"
                    "woff2" -> "font/woff2"
                    "woff" -> "font/woff"
                    "json" -> "application/json"
                    "txt" -> "text/plain"
                    else -> "application/octet-stream"
                }
                return try {
                    WebResourceResponse(mime, "UTF-8", 200, "OK", mapOf("Cache-Control" to "no-cache"), assets.open(asset))
                } catch (_: IOException) { errorResponse(404, "Not Found") }
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) showLoadError()
            }

            override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, response: WebResourceResponse) {
                if (request.isForMainFrame) showLoadError()
            }
        }
        browser.loadUrl("${AssetRoutes.ORIGIN}/")
        if (!bridgeSupported) AlertDialog.Builder(this).setTitle("请更新 Android System WebView")
            .setMessage("当前设备不支持安全分享通道。你可以继续手动添加收藏，系统分享暂留在应用内等待更新。")
            .setPositiveButton("继续") { _, _ -> }.show()
    }

    private fun errorResponse(status: Int, message: String) = WebResourceResponse(
        "text/plain", "UTF-8", status, message, emptyMap(), ByteArrayInputStream(message.toByteArray())
    )

    private fun showLoadError() {
        if (isFinishing || isDestroyed) return
        AlertDialog.Builder(this).setTitle("收集箱加载失败")
            .setMessage("本地页面未能加载，请返回首页重试。")
            .setPositiveButton("返回首页") { _, _ -> browser.loadUrl("${AssetRoutes.ORIGIN}/") }
            .setNegativeButton("关闭") { _, _ -> finish() }.show()
    }

    @Deprecated("Legacy back dispatch is explicitly enabled for this preview")
    override fun onBackPressed() {
        if (keyboardVisible && Build.VERSION.SDK_INT >= 30) { window.insetsController?.hide(WindowInsets.Type.ime()); return }
        if (bridgeSupported) browser.evaluateJavascript("window.dispatchEvent(new Event('ribbon-back'))", null)
        else AlertDialog.Builder(this).setMessage("退出应用？已保存内容和持久草稿将保留。")
            .setPositiveButton("退出") { _, _ -> finish() }.setNegativeButton("继续") { _, _ -> }.show()
    }

    private fun acceptShare(incoming: Intent?) {
        if (incoming?.action != Intent.ACTION_SEND) return
        val text = incoming.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()
        val subject = incoming.getStringExtra(Intent.EXTRA_SUBJECT)
        if (!ShareCapture.accepts(incoming.action, incoming.type, text, subject)) {
            AlertDialog.Builder(this).setTitle("无法接收分享").setMessage("请分享非空的纯文字或链接；载荷最多 100,000 字符，标题最多 2,000 字符。超长内容可分段收藏。")
                .setPositiveButton("知道了") { _, _ -> }.show(); return
        }
        try { captures.append(text!!, subject ?: "") }
        catch (_: Exception) { AlertDialog.Builder(this).setTitle("分享未保存").setMessage("待处理队列或本地存储不可用，请先整理草稿后重试。")
            .setPositiveButton("知道了") { _, _ -> }.show() }
    }
    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); setIntent(intent); acceptShare(intent); browser.evaluateJavascript("window.dispatchEvent(new Event('ribbon-captures'))", null) }
    @Deprecated("Activity result retained for existing Activity wrapper")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) { super.onActivityResult(requestCode, resultCode, data); documents.result(requestCode, resultCode, data); images.result(requestCode, resultCode, data) }

    override fun onSaveInstanceState(outState: Bundle) {
        browser.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onPause() { browser.onPause(); browser.pauseTimers(); super.onPause() }
    override fun onResume() { super.onResume(); browser.onResume(); browser.resumeTimers() }
    override fun onDestroy() { cloud.close(); images.close(); documents.close(); browser.stopLoading(); browser.destroy(); super.onDestroy() }
}
