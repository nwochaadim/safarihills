const { withPodfile } = require("@expo/config-plugins");
const { mergeContents } = require("@expo/config-plugins/build/utils/generateCode");

const FRAMEWORK_BLOCK = `  if framework_linkage
    use_frameworks! :linkage => framework_linkage.to_sym
    $RNFirebaseAsStaticFramework = framework_linkage == 'static'
  end`;

const FRAMEWORK_REGEX =
  /  use_frameworks! :linkage => podfile_properties\['ios\.useFrameworks'\]\.to_sym if podfile_properties\['ios\.useFrameworks'\]\s*\n  use_frameworks! :linkage => ENV\['USE_FRAMEWORKS'\]\.to_sym if ENV\['USE_FRAMEWORKS'\]/m;

function patchPodfile(src) {
  let contents = src;

  if (!contents.includes("framework_linkage = podfile_properties['ios.useFrameworks'] || ENV['USE_FRAMEWORKS']")) {
    contents = mergeContents({
      src: contents,
      newSrc: [
        "framework_linkage = podfile_properties['ios.useFrameworks'] || ENV['USE_FRAMEWORKS']",
        "",
        "# Firebase Swift pods need module maps when CocoaPods integrates pods as frameworks.",
        "use_modular_headers! if framework_linkage",
      ].join("\n"),
      tag: "react-native-firebase-modular-headers",
      anchor: /platform :ios,/,
      offset: 0,
      comment: "#",
    }).contents;
  }

  if (contents.includes(FRAMEWORK_BLOCK)) {
    return contents;
  }

  if (!FRAMEWORK_REGEX.test(contents)) {
    throw new Error(
      "Failed to patch ios/Podfile for Firebase modular headers because the use_frameworks! block was not found."
    );
  }

  return contents.replace(FRAMEWORK_REGEX, FRAMEWORK_BLOCK);
}

module.exports = function withFirebaseModularHeaders(config) {
  return withPodfile(config, (config) => {
    config.modResults.contents = patchPodfile(config.modResults.contents);
    return config;
  });
};
