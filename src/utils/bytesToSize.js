function bytesToSize(bytes) {
  if (bytes === 0 || bytes === "0") return 0;
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return [(bytes / Math.pow(k, i)).toFixed(2), sizes[i]].join(" ");
}
module.exports = bytesToSize;
