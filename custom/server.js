const fs = require('fs');
const path = require('path');

function loadFeatureModules() {
  const featuresDir = path.join(__dirname, 'features');
  if (!fs.existsSync(featuresDir)) return [];

  return fs.readdirSync(featuresDir)
    .filter((name) => name.endsWith('.js'))
    .sort()
    .map((name) => {
      try {
        return require(path.join(featuresDir, name));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function register(app) {
  const modules = loadFeatureModules();
  for (const mod of modules) {
    if (typeof mod.register === 'function') {
      mod.register(app);
    }
  }
}

module.exports = {
  register,
};
