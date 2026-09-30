package app.dayward

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.core.content.edit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.CancellationException
import org.json.JSONObject
import java.util.UUID

class WeatherModel(application: Application) : AndroidViewModel(application) {
    private val prefs = application.getSharedPreferences("gateway", 0)
    private val store = PlanStore(application)
    var endpoint by mutableStateOf(prefs.getString("origin", "http://10.0.2.2:8787")!!)
        private set
    var catalog by mutableStateOf<List<JSONObject>>(emptyList())
        private set
    var forecast by mutableStateOf<JSONObject?>(null)
        private set
    var assessment by mutableStateOf<JSONObject?>(null)
        private set
    var plans by mutableStateOf<List<JSONObject>>(emptyList())
        private set
    var checks by mutableStateOf<Map<String, List<String>>>(emptyMap())
        private set
    var busy by mutableStateOf(false)
        private set
    var message by mutableStateOf<String?>(null)
        private set
    var storageError by mutableStateOf(false)
        private set

    init { operation {
        try { plans = withContext(Dispatchers.IO) { store.read() } }
        catch (_: Exception) { storageError = true; message = "Saved plans could not be read. The original file has been preserved; saving is disabled." }
        catalog = Api(endpoint).get("/v1/catalog").objects("places")
    } }

    private fun operation(block: suspend () -> Unit) {
        if (busy) return
        busy = true
        viewModelScope.launch {
            try { block() }
            catch (error: CancellationException) { throw error }
            catch (error: Exception) { message = error.message ?: "Something went wrong. Try again." }
            finally { busy = false }
        }
    }
    fun connect(origin: String) = operation {
        val places = Api(origin.trim()).get("/v1/catalog").objects("places")
        endpoint = origin.trim().trimEnd('/')
        prefs.edit { putString("origin", endpoint) }
        catalog = places
        forecast = null
        assessment = null
        checks = emptyMap()
        message = "Gateway connected. Choose a place."
    }
    fun load(place: String) = operation {
        forecast = null
        assessment = null
        forecast = Api(endpoint).get("/v1/forecast?place=$place")
        message = null
    }
    fun clearAssessment() { assessment = null }
    fun assess(place: String, start: Long, duration: Int, profile: String) = operation {
        assessment = null
        assessment = Api(endpoint).get("/v1/window?place=$place&start=$start&duration=$duration&profile=$profile")
    }
    fun save(title: String) = operation {
        check(!storageError) { "Saved plan storage needs recovery before changes can be made." }
        check(plans.count { it.getJSONObject("baseline").getLong("end") > System.currentTimeMillis() / 1000 } < 5) { "Five active plans are saved. Remove a plan before adding another." }
        val baseline = assessment ?: error("Check a time window first.")
        check(baseline.getLong("start") > System.currentTimeMillis() / 1000) { "Choose a future window." }
        val item = JSONObject().put("id", UUID.randomUUID().toString()).put("title", title.trim().take(80).ifEmpty { "Outdoor plan" }).put("savedAt", System.currentTimeMillis() / 1000).put("baseline", JSONObject(baseline.toString()))
        val next = plans + item
        withContext(Dispatchers.IO) { store.write(next) }
        plans = next
        message = "Plan saved on this device. Check it again from Plans."
    }
    fun remove(id: String) = operation {
        check(!storageError)
        val next = plans.filterNot { it.getString("id") == id }
        withContext(Dispatchers.IO) { store.write(next) }
        plans = next
        checks = checks - id
    }
    fun checkPlan(plan: JSONObject) = operation {
        val baseline = plan.getJSONObject("baseline")
        val id = plan.getString("id")
        checks = checks - id
        val current = Api(endpoint).get("/v1/window?place=${baseline.getJSONObject("place").getString("id")}&start=${baseline.getLong("start")}&duration=${baseline.getInt("duration")}&profile=${baseline.getString("profile")}")
        checks = checks + (id to (listOf("Fetched ${localTime(current.getLong("fetchedAt"), baseline.getJSONObject("place").getString("timezone"))}") + comparePlans(baseline, current) + current.strings("reasons")))
    }
}
