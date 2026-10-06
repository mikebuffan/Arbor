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
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.example.arbor"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
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

    // Two independently installable apps from one Flutter codebase.
    // "arbor" keeps the existing package; "grove" gets its own launcher.
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
                // Debug/test builds keep an independent install ID. A real
                // release is blocked above until an owner-approved ID exists.
                applicationIdSuffix = ".grove"
            }
            versionNameSuffix = "-grove"
            if (groveSigningReady) {
                signingConfig = signingConfigs.getByName("groveRelease")
            }
        }
    }

    buildTypes {
        release {
            // Never ship a release APK under the Android debug identity.
            // Grove release tasks fail above unless the private signing
            // credential set is present. Debug builds remain available for CI.
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
