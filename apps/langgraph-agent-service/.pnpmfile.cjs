module.exports = {
  hooks: {
    readPackage(pkg) {
      // This ensures package dependencies are properly handled
      return pkg;
    },
  },
}; 