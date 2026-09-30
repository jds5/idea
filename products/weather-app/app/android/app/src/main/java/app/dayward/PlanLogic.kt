package app.dayward

import org.json.JSONObject
import org.json.JSONArray
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

fun JSONObject.objects(key: String): List<JSONObject> = getJSONArray(key).let { a -> (0 until a.length()).map(a::getJSONObject) }
fun JSONObject.strings(key: String): List<String> = getJSONArray(key).let { a -> (0 until a.length()).map(a::getString) }
fun JSONObject.number(key: String): Double? = if (isNull(key)) null else getDouble(key).takeIf { it.isFinite() }
fun number(value: Double?): String = value?.let { String.format(Locale.US, "%.1f", it) } ?: "—"
fun localTime(epoch: Long, zone: String): String = DateTimeFormatter.ofPattern("EEE d MMM, HH:mm z", Locale.UK).withZone(ZoneId.of(zone)).format(Instant.ofEpochSecond(epoch))

fun jsonEqual(a: Any?, b: Any?): Boolean = when {
    a is JSONObject && b is JSONObject -> {
        val keys = a.keys().asSequence().toSet()
        keys == b.keys().asSequence().toSet() && keys.all { jsonEqual(a.get(it), b.get(it)) }
    }
    a is JSONArray && b is JSONArray -> a.length() == b.length() && (0 until a.length()).all { jsonEqual(a.get(it), b.get(it)) }
    a is Number && b is Number -> a.toDouble() == b.toDouble()
    else -> a == b
}

object PlanCodec {
    fun encode(plans: List<JSONObject>): String = JSONObject().put("schema", 1).put("plans", JSONArray(plans)).toString()
    fun decode(text: String): List<JSONObject> {
        val root = JSONObject(text)
        require(root.getInt("schema") == 1) { "Saved plan format is unsupported." }
        return root.objects("plans").onEach {
            it.getString("id"); it.getString("title"); it.getLong("savedAt")
            val baseline = it.getJSONObject("baseline")
            baseline.getLong("start"); baseline.getLong("end"); baseline.getInt("duration")
            baseline.getString("profile"); baseline.getString("status")
            baseline.getJSONObject("place").getString("timezone")
            baseline.getJSONObject("place").getString("name")
            baseline.getJSONObject("place").getString("id")
            baseline.getJSONObject("basis"); baseline.getJSONObject("preference")
            baseline.getLong("fetchedAt"); baseline.getLong("evaluatedAt")
            baseline.strings("reasons")
            baseline.objects("models").forEach { model ->
                model.getString("id"); model.getString("name"); model.strings("issues"); model.strings("limits")
                val metrics = model.getJSONObject("metrics")
                listOf("minTemp", "maxTemp", "rain", "wind", "gust").forEach { key ->
                    require(metrics.has(key)) { "Saved forecast metrics are incomplete." }
                    if (!metrics.isNull(key)) require(metrics.getDouble(key).isFinite())
                }
            }
        }
    }
}

/** Compare the same physical interval, preferences and model definitions; never rewrite the baseline. */
fun comparePlans(before: JSONObject, after: JSONObject): List<String> {
    val basisA = before.getJSONObject("basis")
    val basisB = after.getJSONObject("basis")
    val contextSame = before.getJSONObject("place").getString("id") == after.getJSONObject("place").getString("id") &&
        before.getLong("start") == after.getLong("start") && before.getLong("end") == after.getLong("end") &&
        before.getString("profile") == after.getString("profile") &&
        jsonEqual(before.getJSONObject("preference"), after.getJSONObject("preference"))
    if (!contextSame || !jsonEqual(basisA, basisB)) return listOf("Comparison basis changed. These forecasts cannot be presented as a weather change.")
    if (after.getLong("fetchedAt") < before.getLong("fetchedAt")) return listOf("The gateway has an older snapshot. Your saved baseline is unchanged.")
    val notes = mutableListOf<String>()
    if (after.getLong("evaluatedAt") > before.getLong("start")) notes += "This plan has started. Values are forecast references, not observations."
    val latest = after.objects("models").associateBy { it.getString("id") }
    val metricNames = mapOf("minTemp" to "minimum temperature (°C)", "maxTemp" to "maximum temperature (°C)", "rain" to "total rain (mm)", "wind" to "maximum sampled wind (km/h)", "gust" to "maximum gust (km/h)")
    for (model in before.objects("models")) {
        val next = latest[model.getString("id")] ?: return listOf("Model coverage changed. Reassess this plan.")
        for ((key, label) in metricNames) {
            val old = model.getJSONObject("metrics").number(key)
            val new = next.getJSONObject("metrics").number(key)
            if (old != new) notes += "${model.getString("name")} · $label: ${number(old)} → ${number(new)}"
        }
    }
    if (before.getString("status") != after.getString("status")) notes += "Assessment: ${before.getString("status")} → ${after.getString("status")}"
    if (notes.isEmpty()) notes += if (before.getLong("fetchedAt") == after.getLong("fetchedAt")) "No newer collected snapshot. This is not confirmation that the forecast is unchanged." else "No change in the displayed window metrics since saving."
    return notes
}
