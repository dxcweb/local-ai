const treeKill = require("tree-kill");

const killChild = (child) => {
  if (child) {
    if (child.pid) {
      treeKill(child.pid);
    } else {
      this.child.kill();
    }
    this.child = null;
  }
};

module.exports = killChild;
