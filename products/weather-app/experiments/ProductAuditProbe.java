import app.dayward.PlanLogicKt;
import org.json.JSONArray;
import org.json.JSONObject;

/** Diagnostic inputs only: never real weather or a test that requires bugs to remain. */
class ProductAuditProbe {
    static JSONObject fixture(double firstRain, double secondRain, long fetchedAt) {
        var result = new JSONObject("""
            {"place":{"id":"london"},"start":36000,"end":43200,
             "profile":"leisure","preference":{"rain":0.2},
             "basis":{"rule":"v1","transform":"v1","product":"deterministic","models":["gfs"]},
             "evaluatedAt":200,"status":"insufficient",
             "models":[{"id":"gfs","name":"GFS","metrics":
             {"minTemp":18,"maxTemp":18,"rain":0,"wind":10,"gust":15}}]}
            """);
        result.put("fetchedAt", fetchedAt);
        var model = result.getJSONArray("models").getJSONObject(0);
        model.getJSONObject("metrics").put("rain", firstRain + secondRain);
        var hours = new JSONArray();
        double[] rains = {firstRain, secondRain};
        for (int i = 0; i < rains.length; i++) {
            hours.put(new JSONObject().put("start", 36000 + i * 3600)
                .put("temperature", 18).put("rain", rains[i]).put("wind", 10).put("gust", 15));
        }
        model.put("hours", hours);
        return result;
    }

    public static void main(String[] args) {
        var shifted = new JSONObject().put("case", "rain_moves_one_hour_total_unchanged")
            .put("beforeHourlyRainMm", new JSONArray(new double[]{1, 0}))
            .put("afterHourlyRainMm", new JSONArray(new double[]{0, 1}))
            .put("actualMessages", new JSONArray(PlanLogicKt.comparePlans(fixture(1, 0, 100), fixture(0, 1, 200))));
        var rounded = new JSONObject().put("case", "small_change_same_display_rounding")
            .put("beforeTotalRainMm", 0.11).put("afterTotalRainMm", 0.14)
            .put("actualMessages", new JSONArray(PlanLogicKt.comparePlans(fixture(0.11, 0, 100), fixture(0.14, 0, 200))));
        System.out.println(new JSONObject().put("kind", "synthetic JVM diagnostic; not device or forecast accuracy testing")
            .put("cases", new JSONArray().put(shifted).put(rounded)).toString(2));
    }
}
