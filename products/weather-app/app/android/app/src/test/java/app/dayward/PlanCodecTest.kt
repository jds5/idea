package app.dayward

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class PlanCodecTest {
    private fun plan() = JSONObject("""{"id":"local-1","title":"Walk","savedAt":100,"baseline":{"start":36000,"end":43200,"duration":2,"profile":"leisure","status":"insufficient","place":{"id":"london","name":"London","timezone":"Europe/London"},"basis":{"rule":"v1"},"preference":{"rain":0.2},"fetchedAt":100,"evaluatedAt":110,"reasons":["Unknown run"],"models":[{"id":"gfs","name":"GFS","issues":[],"limits":[],"metrics":{"minTemp":10,"maxTemp":15,"rain":null,"wind":10,"gust":20},"hours":[{"rain":null}]}]}}""")
    @Test fun persistedBaselineRoundTripsMissingValuesAndVersion() {
        val original = plan()
        val recovered = PlanCodec.decode(PlanCodec.encode(listOf(original))).single()
        assertTrue(jsonEqual(original, recovered))
        assertTrue(recovered.getJSONObject("baseline").objects("models")[0].getJSONObject("metrics").isNull("rain"))
    }
    @Test fun invalidStoredStateFailsInsteadOfReturningAnEmptyPlanList() {
        listOf("{broken", """{"schema":2,"plans":[]}""", """{"schema":1,"plans":[{"id":"x"}]}""").forEach { text ->
            assertThrows(Exception::class.java) { PlanCodec.decode(text) }
        }
    }
    @Test fun validEmptyStateIsDistinctFromCorruption() {
        assertTrue(PlanCodec.decode(PlanCodec.encode(emptyList())).isEmpty())
    }
}
