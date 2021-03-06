var fs = require('fs');
var path = require('path');

var build = require('eq80/index.html');
//var build = require('../build.js');
var buildStats = build.buildStats();

var outputPath = path.resolve(__dirname, 'eq80/index.html')

console.log('Requesting persistence...');
var persistence = require('../persistence/lib/persistence.html');
console.log((persistence+'').length+' chars');


var useBuiltFiles = false;

console.log('Building loader TypeScript...');
var builtContent = useBuiltFiles ? fs.readFileSync(path.join(__dirname, 'loader.js')) + '' :
  build.compileTS('--project', path.join(__dirname, 'src/tsconfig.json'), '--pretty')['loader.js'];
console.log(builtContent.length+' chars');

console.log('Building tools TypeScript...');
var builtToolsContent = useBuiltFiles ? fs.readFileSync(path.join(__dirname, 'loader-tools.js')) + '' :
  build.compileTS('--project', path.join(__dirname, 'src-tools/tsconfig.json'), '--pretty')['loader-tools.js'];
console.log(builtToolsContent.length+' chars');

console.log('Building cli TypeScript...');
var builtCLIContent = useBuiltFiles ? fs.readFileSync(path.join(__dirname, 'cli.js')) + '' :
  build.compileTS('--project', path.join(__dirname, 'src-cli/tsconfig.json'), '--pretty')['cli.js'];
console.log(builtCLIContent.length+' chars');

console.log('Building tests TypeScript...');
var builtTests = useBuiltFiles ? fs.readFileSync(path.join(__dirname, 'loader-tests.js')) + '' :
  build.compileTS('--project', path.join(__dirname, 'tests/tsconfig.json'), '--pretty')['loader-tests.js'];
console.log(builtTests.length+' chars');

var buildStats = buildStats();


console.log('Combining...');


var template = build.buildTemplate;
var wrapped = build.wrapScript({
    lib: build.functionBody(loader_lib_content, {
      stats: buildStats,
      loader: builtContent,
      persistence: persistence+''
    }),
    lib_tests: 'loader();\n\n\n'+builtTests,
  	lib_exports:
  		'function build_tools(exports) {\n'+
  		'  var fs = require("fs"), path = require("path");'+
  		builtToolsContent+'\n\n\n'+
  		'  exports.htmlSpotExternals = htmlSpotExternals;\n'+
    	'  exports.compileTS = compileTS;\n'+
    	'  exports.buildStats = buildStats;\n'+
    	'  exports.jsString = jsString;\n'+
    	'  exports.jsStringLong = jsStringLong;\n'+
    	'  exports.functionBody = functionBody;\n'+
    	'  exports.functionArgs = functionArgs;\n'+
    	'  exports.wrapScript = wrapScript;\n'+
    	'  exports.substitute = substitute;\n'+
      '  exports.wrapEQ80 = wrapEQ80;\n' +
      '  exports.checkBlownLines = checkBlownLines;\n' +
    	'  exports.getFiles = getFiles;\n'+
  		'\n'+
  		'  persistence();\n'+
  		'  exports.loader = loader;\n'+
  		'  exports.persistence = persistence;\n'+
  		'}\n\n'+
  		'build_tools(module.parent ? module.exports : loader);'
  });

console.log('Extending with CLI...');
var extendedCLI =
    '//<!-- EQ80 CLI \n' +
    builtCLIContent+'\n//-->' +
    wrapped.replace(/\s+$/, '') + ' <!--\n if (!module.parent) cli(); // -->';

console.log('Build into '+outputPath+' ('+extendedCLI.length+' chars), taken '+((buildStats.taken)/1000)+' sec.');
fs.writeFileSync(outputPath, extendedCLI);



function loader_lib_content() {

function loader(window, document) {

	loader.build = "#stats#"

"#loader#"

	loader.on = on;
  loader.off = off;
  loader.createFrame = createFrame;
  loader.fadeToUI = fadeToUI;
  loader.updateSize = function() { sz.update(); };


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

"#persistence#"


}