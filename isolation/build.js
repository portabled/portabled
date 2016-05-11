var fs = require('fs');
var path = require('path');

var build = require('../build.js');
var buildStats = build.buildStats();

var outputPath = path.resolve(__dirname, 'lib/isolation.html');

console.log('Building isolation TypeScript...');
var builtContent = build.compileTS('--project', path.join(__dirname, 'src/tsconfig.json'), '--pretty')['isolation.js'];
console.log(builtContent.length+' chars');

console.log('Building tests TypeScript...');
var builtTests = build.compileTS('--project', path.join(__dirname, 'tests/tsconfig.json'), '--pretty')['isolation-tests.js'];
console.log(builtTests.length+' chars');

var buildStats = buildStats();


console.log('Combining...');


var template = build.buildTemplate;
var wrapped = build.wrapScript({
    lib: build.functionBody(isolation_lib_content,{
      stats: buildStats,
      isolation: builtContent
    }),
    lib_tests: 'isolation();\n'+builtTests,
  	lib_exports: 'isolation();\n'+'module.exports = isolation;'
  });

console.log('Build into '+outputPath+' ('+wrapped.length+' chars), taken '+((buildStats.taken)/1000)+' sec.');
fs.writeFileSync(outputPath, wrapped);



function isolation_lib_content() {

function isolation() {

	isolation.build = "#stats#"

"#isolation#"

  isolation.HostedProcess = HostedProcess;
  isolation.Context = Context;

}

}