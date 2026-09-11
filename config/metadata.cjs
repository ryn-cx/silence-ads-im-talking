const { author, repository, version } = require("../package.json");

module.exports = {
  name: "Silence Ads, I'm Talking.",
  namespace: "https://github.com/ryn-cx/",
  version: version,
  author: author,
  source: repository.url,
  description:
    "Real time ad silencer for streaming websites. When an ad is detected the audio is silenced and the video is covered by a slightly transparent modal. When the ad ends the audio is unmuted and the modal is removed.",
  match: ["*://www.netflix.com/*"],
  require: [],
  grant: [],
  "run-at": "document-end",
};
