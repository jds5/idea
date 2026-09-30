package app.dayward

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import org.json.JSONObject

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MaterialTheme(colorScheme = lightColorScheme(primary = Color(0xFF245D4C), secondary = Color(0xFF7B613B), background = Color(0xFFF8F7F2), surface = Color(0xFFF8F7F2), surfaceContainer = Color(0xFFECEFE7))) {
                Dayward()
            }
        }
    }
}

@Composable
private fun Dayward(model: WeatherModel = viewModel()) {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    val tabs = listOf("Weather", "Plans", "Setup")
    val screens = rememberSaveableStateHolder()
    Scaffold(
        bottomBar = {
            NavigationBar {
                tabs.forEachIndexed { index, label ->
                    NavigationBarItem(selected = index == tab, onClick = { tab = index }, icon = { Text(listOf("◷", "▤", "⚙")[index]) }, label = { Text(label) })
                }
            }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("DAYWARD", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
            if (model.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            model.message?.let { Note(it) }
            screens.SaveableStateProvider(tab) {
                when (tab) {
                    0 -> Weather(model)
                    1 -> Plans(model)
                    2 -> Setup(model)
                }
            }
            Text("Internal build · Forecasts, not observations", style = MaterialTheme.typography.labelSmall)
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
private fun Note(text: String) {
    Surface(color = MaterialTheme.colorScheme.surfaceContainer, shape = RoundedCornerShape(16.dp)) {
        Text(text, Modifier.fillMaxWidth().padding(16.dp), style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun Choice(label: String, selected: String, choices: List<Pair<String, String>>, enabled: Boolean, onChoose: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Column {
        Text(label, style = MaterialTheme.typography.labelMedium)
        Box {
            OutlinedButton(onClick = { expanded = true }, enabled = enabled && choices.isNotEmpty(), modifier = Modifier.fillMaxWidth()) {
                Text(choices.firstOrNull { it.first == selected }?.second ?: "Choose $label")
            }
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                choices.forEach { (id, text) -> DropdownMenuItem(text = { Text(text) }, onClick = { expanded = false; onChoose(id) }) }
            }
        }
    }
}

@Composable
private fun Weather(model: WeatherModel) {
    var place by rememberSaveable { mutableStateOf("london") }
    Text("Make room\nfor outside.", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.SemiBold)
    Text("See the forecasts. Pick a time. Save what you know today.")
    Choice("Sample city", place, model.catalog.map { it.getString("id") to "${it.getString("name")}, ${it.getString("country")}" }, !model.busy) {
        place = it
        model.load(it)
    }
    Button(onClick = { model.load(place) }, enabled = !model.busy && model.catalog.isNotEmpty(), modifier = Modifier.fillMaxWidth()) { Text("Load collected forecast") }
    if (model.catalog.isEmpty() && !model.busy) Note("Connect your local gateway in Setup to load the six sample cities.")
    val forecast = model.forecast ?: return
    val location = forecast.getJSONObject("place")
    val zone = location.getString("timezone")
    val models = forecast.objects("models")
    val now = System.currentTimeMillis() / 1000
    val hours = models.first().objects("hours").filter { it.getLong("start") >= now }.take(48)
    Text(location.getString("name"), style = MaterialTheme.typography.headlineMedium)
    Text("Source fetched ${localTime(forecast.getLong("fetchedAt"), zone)}", style = MaterialTheme.typography.bodySmall)
    Note(if (forecast.getString("cacheState") == "stale") "This snapshot is stale. Reconnect after the collector updates it. Model run time remains unknown." else "Recent fetch · Model run time and native hourly step are unverified. Automatic recommendations are unavailable. Official warnings are not connected.")
    if (hours.isEmpty()) { Note("No upcoming hours in this snapshot. The collector needs to refresh it."); return }
    key(forecast) {
        var start by rememberSaveable { mutableStateOf(hours.first().getLong("start").toString()) }
        var duration by rememberSaveable { mutableStateOf("2") }
        var profile by rememberSaveable { mutableStateOf("leisure") }
        var title by rememberSaveable { mutableStateOf("${location.getString("name")} outdoors") }
        Text("Your time outside", style = MaterialTheme.typography.titleLarge)
        Choice("Start · local time", start, hours.map { it.getLong("start").toString() to localTime(it.getLong("start"), zone) }, !model.busy) { start = it; model.clearAssessment() }
        Choice("Duration", duration, (1..6).map { it.toString() to "$it hour${if (it > 1) "s" else ""}" }, !model.busy) { duration = it; model.clearAssessment() }
        Choice("Preferences", profile, listOf("leisure" to "Outdoor leisure", "cycling" to "Leisure cycling"), !model.busy) { profile = it; model.clearAssessment() }
        Text(if (profile == "leisure") "10–28°C · Rain ≤0.2 mm/h · Wind ≤20 / gust ≤30 km/h" else "8–26°C · Rain ≤0.2 mm/h · Wind ≤15 / gust ≤25 km/h", style = MaterialTheme.typography.bodySmall)
        Button(onClick = { model.assess(location.getString("id"), start.toLong(), duration.toInt(), profile) }, enabled = !model.busy, modifier = Modifier.fillMaxWidth()) { Text("Inspect this window") }
        model.assessment?.let { a ->
            Assessment(a)
            OutlinedTextField(value = title, onValueChange = { title = it.take(80) }, label = { Text("Plan name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Button(onClick = { model.save(title) }, enabled = !model.busy && !model.storageError, modifier = Modifier.fillMaxWidth()) { Text("Save this forecast baseline") }
            Text("Saved on this device. Recheck manually from Plans; automatic notifications are not available.", style = MaterialTheme.typography.bodySmall)
        }
        Text("Hourly reference", style = MaterialTheme.typography.titleLarge)
        Text("Each model is shown separately. Rain covers the hour starting at the displayed time; unknown values are shown as —.", style = MaterialTheme.typography.bodySmall)
        hours.take(12).forEach { hour ->
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(localTime(hour.getLong("start"), zone), fontWeight = FontWeight.SemiBold)
                    models.forEach { m ->
                        val h = m.objects("hours").firstOrNull { it.getLong("start") == hour.getLong("start") }
                        Text("${m.getString("name")}  ${number(h?.number("temperature"))}°C · ${number(h?.number("rain"))} mm\nWind ${number(h?.number("wind"))} / gust ${number(h?.number("gust"))} km/h", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
    Text(forecast.getString("attribution"), style = MaterialTheme.typography.bodySmall)
    Text(forecast.getString("intervalNote"), style = MaterialTheme.typography.bodySmall)
}

@Composable
private fun Assessment(a: JSONObject) {
    Text(when (a.getString("status")) { "fits" -> "Fits these preferences"; "mixed" -> "Models disagree"; "outside" -> "Outside these preferences"; else -> "Reference only · information incomplete" }, style = MaterialTheme.typography.titleMedium)
    a.strings("reasons").forEach { Text(it, style = MaterialTheme.typography.bodySmall) }
    a.objects("models").forEach { model ->
        val m = model.getJSONObject("metrics")
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(model.getString("name"), fontWeight = FontWeight.SemiBold)
                Text("${number(m.number("minTemp"))}–${number(m.number("maxTemp"))}°C · total rain ${number(m.number("rain"))} mm")
                Text("Max sampled wind ${number(m.number("wind"))} · gust ${number(m.number("gust"))} km/h", style = MaterialTheme.typography.bodySmall)
                if (model.strings("limits").isNotEmpty()) Text("Values outside your preferences: ${model.strings("limits").joinToString()}", style = MaterialTheme.typography.bodySmall)
                model.strings("issues").forEach { Text(it, style = MaterialTheme.typography.bodySmall) }
            }
        }
    }
}

@Composable
private fun Plans(model: WeatherModel) {
    var deleting by remember { mutableStateOf<JSONObject?>(null) }
    Text("Plans worth\ncoming back to.", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.SemiBold)
    Text("Check what changed against the forecast you actually saved.")
    if (model.storageError) Note("Storage could not be read. Existing data has been preserved; saving and deletion are disabled.")
    if (model.plans.isEmpty()) Note("No plans yet. Choose a city and a time in Weather, then save the baseline.")
    model.plans.reversed().forEach { plan ->
        val a = plan.getJSONObject("baseline")
        val zone = a.getJSONObject("place").getString("timezone")
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(plan.getString("title"), style = MaterialTheme.typography.titleLarge)
                Text("${a.getJSONObject("place").getString("name")} · ${localTime(a.getLong("start"), zone)}\n${a.getInt("duration")} hours · ${a.getString("profile")}")
                Text("Saved ${localTime(plan.getLong("savedAt"), zone)}", style = MaterialTheme.typography.bodySmall)
                if (a.getLong("end") < System.currentTimeMillis() / 1000) Text("Past plan · stored forecast reference")
                var expanded by remember { mutableStateOf(false) }
                TextButton(onClick = { expanded = !expanded }) { Text(if (expanded) "Hide saved forecast" else "View saved forecast") }
                if (expanded) Assessment(a)
                Button(onClick = { model.checkPlan(plan) }, enabled = !model.busy) { Text("Check against latest collection") }
                model.checks[plan.getString("id")]?.forEach { Text(it, style = MaterialTheme.typography.bodyMedium) }
                TextButton(onClick = { deleting = plan }, enabled = !model.busy && !model.storageError) { Text("Delete plan") }
            }
        }
    }
    deleting?.let { plan ->
        AlertDialog(onDismissRequest = { deleting = null }, title = { Text("Delete this plan?") }, text = { Text("Its saved forecast baseline will be removed from this device.") }, confirmButton = { TextButton(onClick = { model.remove(plan.getString("id")); deleting = null }) { Text("Delete") } }, dismissButton = { TextButton(onClick = { deleting = null }) { Text("Keep plan") } })
    }
}

@Composable
private fun Setup(model: WeatherModel) {
    var origin by rememberSaveable(model.endpoint) { mutableStateOf(model.endpoint) }
    Text("A small start.\nAn honest forecast.", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.SemiBold)
    Note("Developer setup · This internal build connects to your own weather gateway. No public service has been launched.")
    OutlinedTextField(value = origin, onValueChange = { origin = it }, label = { Text("Gateway origin") }, supportingText = { Text("Emulator: http://10.0.2.2:8787\nUSB device with adb reverse: http://127.0.0.1:8787") }, singleLine = true, modifier = Modifier.fillMaxWidth())
    Button(onClick = { model.connect(origin) }, enabled = !model.busy, modifier = Modifier.fillMaxWidth()) { Text("Connect gateway") }
    Text("Privacy", style = MaterialTheme.typography.titleLarge)
    Text("Plans and their forecast baselines stay in app storage on this device. Backups are disabled. Requests send the selected sample city, time and preference profile to your gateway. There are no accounts, analytics or advertising SDKs. Your network provider and gateway can see connection metadata.")
    Text("Sources & limits", style = MaterialTheme.typography.titleLarge)
    Text("NOAA GFS and DWD ICON, processed by your self-hosted Open-Meteo service. Open-Meteo data: CC BY 4.0. https://open-meteo.com/en/license\n\nOnly six sample cities and approximately 48 upcoming hours are exposed in this build. Model run provenance and native hourly resolution are unverified. Official warnings, automatic recommendations, notifications and month-ahead outlooks are not available.")
    Text("Dayward is a working name. Monetisation is undecided. This build contains no ads or purchases.", style = MaterialTheme.typography.bodySmall)
}
