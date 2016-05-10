var fs = require('fs');
var path = require('path');

var build = require('../build.js');
var buildStats = build.buildStats();

var outputPath = path.resolve('lib/loader.html')

console.log('Building loader TypeScript...');
var builtContent = build.compileTS('--project', 'src/tsconfig.json', '--pretty')['../lib/loader.js'];
console.log(builtContent.length+' chars');

console.log('Building tests TypeScript...');
var builtTests = build.compileTS('--project', 'tests/tsconfig.json', '--pretty')['../../lib/loader-tests.js'];
console.log(builtTests.length+' chars');

var buildStats = buildStats();


console.log('Combining...');


var template = build.buildTemplate;
var wrapped = build.wrapScript({
    lib: build.functionBody(loader_lib_content,{
      stats: buildStats,
      loader: builtContent
    }),
    lib_tests: 'loader();\n'+builtTests,
  	lib_exports: 'module.exports = loader;'
  });

console.log('Build into '+outputPath+' ('+wrapped.length+' chars), taken '+((buildStats.taken)/1000)+' sec.');
fs.writeFileSync(outputPath, wrapped);



function loader_lib_content() {

function loader(window, document) {

	loader.build = "#stats#"

"#loader#"

	loader.on = on;
  loader.off = off;
  loader.createFrame = createFrame;
  loader.fadeToUI = fadeToUI;

	if (window) {
    if (!document) document = window;
    // TODO: export state for use
    startBoot();

    loader.boot =boot;
    loader.shell = shell;
    loader.bootState = bootState;
    loader.timings = timings;
  }
  else {
    // TODO: export state for testing
    loader.deriveUniqueKey = deriveUniqueKey;
  }
}
}