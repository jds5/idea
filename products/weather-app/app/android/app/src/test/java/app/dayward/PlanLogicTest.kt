package app.dayward

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class PlanLogicTest {
    private fun fixture() = JSONObject("""{"place":{"id":"london"},"start":36000,"end":43200,"profile":"leisure","preference":{"rain":0.2},"basis":{"rule":"v1","transform":"v1","product":"deterministic","models":["gfs"]},"fetchedAt":100,"evaluatedAt":100,"status":"insufficient","models":[{"id":"gfs","name":"GFS","metrics":{"minTemp":12,"maxTemp":15,"rain":0,"wind":10,"gust":20}}]}""")
    @Test fun unchangedCollectionIsNotConfirmation() {
        assertTrue(comparePlans(fixture(), fixture()).single().contains("No newer"))
    }
    @Test fun rainChangeComparedToSavedBaseline() {
        val before = fixture(); val after = fixture().put("fetchedAt", 200)
        after.objects("models")[0].getJSONObject("metrics").put("rain", 2)
        assertTrue(comparePlans(before, after).single().contains("0.0 → 2.0"))
        assertEquals(0.0, before.objects("models")[0].getJSONObject("metrics").number("rain")!!, 0.0)
    }
    @Test fun missingIsNotZero() {
        val after = fixture().put("fetchedAt", 200)
        after.objects("models")[0].getJSONObject("metrics").put("gust", JSONObject.NULL)
        assertTrue(comparePlans(fixture(), after).single().contains("20.0 → —"))
    }
    @Test fun ruleOrPreferencesChangesAreNotWeatherChanges() {
        val after = fixture(); after.getJSONObject("basis").put("rule", "v2")
        assertTrue(comparePlans(fixture(), after).single().contains("basis changed"))
        val changedPreferences = fixture(); changedPreferences.getJSONObject("preference").put("rain", 1)
        assertTrue(comparePlans(fixture(), changedPreferences).single().contains("basis changed"))
    }
    @Test fun olderSnapshotIsRejected() {
        assertTrue(comparePlans(fixture(), fixture().put("fetchedAt", 90)).single().contains("older snapshot"))
    }
    @Test fun daylightSavingRepeatedHourHasExplicitZone() {
        val a = localTime(1792888200, "Europe/London")
        val b = localTime(1792891800, "Europe/London")
        assertNotEquals(a, b)
    }
}
