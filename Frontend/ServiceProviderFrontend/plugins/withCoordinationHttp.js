const { withAndroidManifest, withProjectBuildGradle } = require('expo/config-plugins');
module.exports = config => {
  config = withAndroidManifest(config, config => {
    // The deployed coordination ALB currently serves HTTP.
    const application = config.modResults.manifest.application?.[0];
    if (application) application.$['android:usesCleartextTraffic'] = 'true';
    return config;
  });
  return withProjectBuildGradle(config, config => {
    if (!config.modResults.contents.includes('// WorkWave: use the project')) config.modResults.contents += "\n// WorkWave: use the project's NDK for every Android library.\nsubprojects { subproject ->\n    subproject.plugins.withId('com.android.library') {\n        subproject.android.ndkVersion = rootProject.ext.ndkVersion\n    }\n}\n";
    return config;
  });
};
