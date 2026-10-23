package com.ribboninbox.app

import android.app.Activity
import android.content.Intent
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.charset.CodingErrorAction
import java.util.concurrent.Executors

class BackupDocuments(private val activity: Activity) {
    companion object { const val EXPORT = 4101; const val IMPORT = 4102; const val LIMIT = 50 * 1024 * 1024 }
    private val worker = Executors.newSingleThreadExecutor()
    private var callback: ((JSONObject) -> Unit)? = null
    private var content: String? = null
    private fun failure(code: String, message: String) = JSONObject().put("ok", false).put("code", code).put("message", message)
    fun choose(export: String?, reply: (JSONObject) -> Unit) {
        if (callback != null) { reply(failure("CONFLICT", "已有文件操作正在进行")); return }
        if (export != null && export.toByteArray(Charsets.UTF_8).size > LIMIT) { reply(failure("TOO_LARGE", "备份超过 50 MiB")); return }
        callback = reply; content = export
        val intent = if (export == null) Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json")
            else Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE, "ribbon-inbox-backup.json")
        try { activity.startActivityForResult(intent, if (export == null) IMPORT else EXPORT) }
        catch (_: Exception) { finish(failure("STORAGE_UNAVAILABLE", "无法打开系统文件选择器")) }
    }
    fun result(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != EXPORT && requestCode != IMPORT) return
        val uri = data?.data
        if (resultCode != Activity.RESULT_OK || uri == null) { finish(failure("CANCELLED", "已取消文件操作")); return }
        val savedContent = content
        worker.execute {
            val result = try {
                if (requestCode == EXPORT) {
                    val bytes = requireNotNull(savedContent).toByteArray(Charsets.UTF_8)
                    activity.contentResolver.openOutputStream(uri, "wt")?.use { it.write(bytes); it.flush() } ?: throw java.io.IOException()
                    JSONObject().put("ok", true).put("value", JSONObject.NULL)
                } else {
                    val bytes = activity.contentResolver.openInputStream(uri)?.use { input ->
                        val output = ByteArrayOutputStream(); val buffer = ByteArray(8192)
                        while (true) { val n = input.read(buffer); if (n < 0) break; if (output.size() + n > LIMIT) throw FileTooLarge(); output.write(buffer, 0, n) }
                        output.toByteArray()
                    } ?: throw java.io.IOException()
                    val decoder = Charsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT)
                    JSONObject().put("ok", true).put("value", decoder.decode(ByteBuffer.wrap(bytes)).toString().removePrefix("\uFEFF"))
                }
            } catch (_: FileTooLarge) { failure("TOO_LARGE", "备份超过 50 MiB") }
              catch (_: Exception) { failure("STORAGE_UNAVAILABLE", "文件读写失败，现有收藏未改动") }
            activity.runOnUiThread { finish(result) }
        }
    }
    private class FileTooLarge : Exception()
    private fun finish(result: JSONObject) { val reply = callback; callback = null; content = null; if (!activity.isDestroyed) reply?.invoke(result) }
    fun close() { callback = null; content = null; worker.shutdownNow() }
}
