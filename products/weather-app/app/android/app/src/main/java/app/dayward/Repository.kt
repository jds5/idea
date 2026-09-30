package app.dayward

import android.content.Context
import android.util.AtomicFile
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL

class Api(private val base: String) {
    init {
        val uri = URI(base)
        require(uri.scheme in listOf("https", "http") && uri.host != null && uri.userInfo == null && uri.query == null && uri.fragment == null && uri.path.orEmpty().trim('/').isEmpty()) { "Enter the gateway origin, for example http://10.0.2.2:8787" }
        require(BuildConfig.DEBUG || uri.scheme == "https") { "HTTPS is required." }
    }
    suspend fun get(path: String): JSONObject = withContext(Dispatchers.IO) {
        val connection = URL(base.trimEnd('/') + path).openConnection() as HttpURLConnection
        try {
            connection.connectTimeout = 10000
            connection.readTimeout = 15000
            connection.instanceFollowRedirects = false
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            val result = runCatching { JSONObject(text) }.getOrElse { throw IllegalStateException("Gateway returned an invalid response (HTTP $code).") }
            check(code in 200..299) { result.optString("error", "Gateway request failed (HTTP $code).") }
            result
        } finally { connection.disconnect() }
    }
}

class PlanStore(context: Context) {
    private val file = AtomicFile(File(context.filesDir, "plans-v1.json"))
    fun read(): List<JSONObject> {
        if (!file.baseFile.exists() && !File(file.baseFile.path + ".bak").exists()) return emptyList()
        return PlanCodec.decode(file.openRead().bufferedReader().use { it.readText() })
    }
    fun write(plans: List<JSONObject>) {
        val content = PlanCodec.encode(plans).toByteArray(Charsets.UTF_8)
        val stream = file.startWrite()
        try { stream.write(content); file.finishWrite(stream) }
        catch (error: Exception) { file.failWrite(stream); throw error }
    }
}
