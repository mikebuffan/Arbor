plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val groveApplicationId = System.getenv("GROVE_ANDROID_APPLICATION_ID")?.trim().orEmpty()
val groveKeystorePath = System.getenv("GROVE_ANDROID_KEYSTORE_PATH")?.trim().orEmpty()
val groveKeystorePassword = System.getenv("GROVE_ANDROID_KEYSTORE_PASSWORD")?.trim().orEmpty()
val groveKeyAlias = System.getenv("GROVE_ANDROID_KEY_ALIAS")?.trim().orEmpty()
val groveKeyPassword = System.getenv("GROVE_ANDROID_KEY_PASSWORD")?.trim().orEmpty()
val groveSigningReady = listOf(
    groveKeystorePath,
    groveKeystorePassword,
    groveKeyAlias,
    groveKeyPassword,
).all { it.isNotEmpty() }
val groveReleaseRequested = gradle.startParameter.taskNames.any {
    it.contains("grove", ignoreCase = true) &&
        it.contains("release", ignoreCase = true)
}

if (groveReleaseRequested && groveApplicationId.isEmpty()) {
    throw GradleException(
        "Grove release application ID is not configured. " +
            "Set GROVE_ANDROID_APPLICATION_ID to the owner-approved package ID."
    )
}
if (groveReleaseRequested && !groveSigningReady) {
    throw GradleException(
        "Grove release signing is not configured. " +
            "Set GROVE_ANDROID_KEYSTORE_PATH, GROVE_ANDROID_KEYSTORE_PASSWORD, " +
            "GROVE_ANDROID_KEY_ALIAS, and GROVE_ANDROID_KEY_PASSWORD."
    )
}

android {
    namespace = "com.example.arbor"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.example.arbor"
        manifestPlaceholders["arborAppLabel"] = "arbor"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (groveSigningReady) {
            create("groveRelease") {
                storeFile = file(groveKeystorePath)
                storePassword = groveKeystorePassword
                keyAlias = groveKeyAlias
                keyPassword = groveKeyPassword
            }
        }
    }

    // Three independently installable products from one Flutter codebase.
    // Arbor remains the original app. Grove remains private. publicalpha is
    // the isolated public Arbor experiment and never inherits Grove signing.
    flavorDimensions += "experience"
    productFlavors {
        create("arbor") {
            dimension = "experience"
        }
        create("grove") {
            dimension = "experience"
            if (groveApplicationId.isNotEmpty()) {
                applicationId = groveApplicationId
            } else {
                applicationIdSuffix = ".grove"
            }
            versionNameSuffix = "-grove"
            if (groveSigningReady) {
                signingConfig = signingConfigs.getByName("groveRelease")
            }
        }
        create("publicalpha") {
            dimension = "experience"
            applicationIdSuffix = ".publicalpha"
            versionNameSuffix = "-publicalpha"
            manifestPlaceholders["arborAppLabel"] = "Arbor Public Alpha"
        }
    }

    buildTypes {
        release {
            // Never ship a release APK under the Android debug identity.
            // Grove release tasks fail above unless the private signing
            // credential set is present. Public alpha release remains gated.
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
