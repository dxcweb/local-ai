var http = require("http");
var https = require("https");
const getProtocol = (download_url) => {
  const options = new URL(download_url);
  let _http;
  if (options.protocol === "https:") {
    _http = https;
  } else if (options.protocol === "http:") {
    _http = http;
  } else {
    throw new Error("valid protocol. only support https and http.");
  }
  return { _http, options };
};

module.exports = getProtocol;
