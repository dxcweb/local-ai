const net = require("net");
function _checkPort(port, hostname) {
  const server = net.createServer();
  return new Promise((resolve, reject) => {
    server.once("error", (err) => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close();
      resolve(true); // 端口未被占用
    });

    server.listen(port, hostname);
  });
}
const checkPort = async (port) => {
  if (!(await _checkPort(port))) return false;
  if (!(await _checkPort(port, "127.0.0.1"))) return false;
  if (!(await _checkPort(port, "0.0.0.0"))) return false;
  return true;
};
module.exports = checkPort;
