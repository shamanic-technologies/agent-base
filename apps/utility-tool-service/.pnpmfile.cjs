/**
 * PNPM configuration file
 */
function readPackage(pkg) {
  return pkg;
}

module.exports = {
  hooks: {
    readPackage
  }
}; 