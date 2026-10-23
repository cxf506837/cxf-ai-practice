package com.ribboninbox.app
import android.app.Activity
import android.content.Intent
import java.io.ByteArrayOutputStream
import java.util.Base64
import java.util.concurrent.Executors
import org.json.JSONObject

class ImageDocuments(private val activity: Activity) {
    private val worker = Executors.newSingleThreadExecutor()
    private var callback: ((JSONObject) -> Unit)? = null
    private val code = 6403
    private fun failure(message: String,code: String = "STORAGE_UNAVAILABLE") = JSONObject().put("ok",false).put("code",code).put("message",message)
    fun choose(reply: (JSONObject) -> Unit) {
        if (callback != null) { reply(failure("已有图片选择正在进行")); return }; callback = reply
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("image/*").putExtra(Intent.EXTRA_MIME_TYPES,arrayOf("image/png","image/jpeg","image/webp"))
        try { activity.startActivityForResult(intent,code) } catch (_: Exception) { finish(failure("无法打开图片选择器")) }
    }
    fun result(requestCode: Int,resultCode: Int,data: Intent?) {
        if (requestCode != code) return
        val uri = data?.data
        if (resultCode != Activity.RESULT_OK || uri == null) { finish(failure("已取消选择图片","CANCELLED")); return }
        worker.execute {
            val result = try {
                val bytes = activity.contentResolver.openInputStream(uri)?.use { input ->
                    val out = ByteArrayOutputStream(); val buffer = ByteArray(8192)
                    while (true) { val n = input.read(buffer); if (n < 0) break; require(out.size() + n <= AiPolicy.IMAGE_LIMIT); out.write(buffer,0,n) }; out.toByteArray()
                } ?: throw java.io.IOException()
                val mime = AiPolicy.imageMime(bytes) ?: throw IllegalArgumentException()
                JSONObject().put("ok",true).put("value","data:$mime;base64," + Base64.getEncoder().encodeToString(bytes))
            } catch (_: IllegalArgumentException) { failure("只支持原图不超过4 MiB的PNG、JPEG、WebP","VALIDATION") }
              catch (_: Exception) { failure("图片读取失败，当前草稿已保留") }
            activity.runOnUiThread { finish(result) }
        }
    }
    private fun finish(result: JSONObject) { val reply = callback; callback = null; if (!activity.isDestroyed) reply?.invoke(result) }
    fun close() { callback = null; worker.shutdownNow() }
}
