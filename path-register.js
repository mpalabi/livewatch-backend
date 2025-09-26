// Runtime path alias mapping for compiled JS (dist)
// Maps tsconfig paths from src/* to dist/* so require('@alias/x') works after build
const tsConfig = require('./tsconfig.json');
const tsConfigPaths = require('tsconfig-paths');

const baseUrl = __dirname; // project dir
const inPaths = (tsConfig && tsConfig.compilerOptions && tsConfig.compilerOptions.paths) || {};
const outPaths = {};
for (const alias in inPaths) {
  if (!Object.prototype.hasOwnProperty.call(inPaths, alias)) continue;
  const arr = inPaths[alias];
  outPaths[alias] = arr.map((p) => p.replace(/^src\//, 'dist/'));
}

tsConfigPaths.register({ baseUrl, paths: outPaths });


