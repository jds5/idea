import java.net.URI

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}
android {
    namespace = "app.dayward"
    compileSdk = 36
    buildToolsVersion = "36.0.0"
    defaultConfig {
        applicationId = "app.dayward.internal"
        minSdk = 28
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0-internal"
        buildConfigField("String", "DEFAULT_GATEWAY_URL", "\"https://localhost\"")
    }
    buildTypes {
        getByName("debug") {
            val origin = providers.gradleProperty("daywardGateway").orElse("http://10.0.2.2:8787").get()
            val uri = URI(origin)
            require(uri.scheme in listOf("http", "https") && uri.host != null && uri.userInfo == null && uri.rawQuery == null && uri.rawFragment == null && uri.path.orEmpty().trim('/').isEmpty()) { "daywardGateway must be an HTTP(S) origin" }
            buildConfigField("String", "DEFAULT_GATEWAY_URL", "\"${origin.trimEnd('/')}\"")
        }
    }
    buildFeatures { compose = true; buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
dependencies {
    implementation(platform("androidx.compose:compose-bom:2025.12.00"))
    implementation("androidx.activity:activity-compose:1.12.2")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.10.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.10.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20250517")
}
