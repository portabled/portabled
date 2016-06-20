var fs = require('fs');
var path = require('path');

var build = require('../build.js');
var buildStats = build.buildStats();

var outputPath = path.resolve(__dirname, 'lib/isolation.html');

console.log('Building isolation agent...');
var builtAgent = build.compileTS('--project', path.join(__dirname, 'agent/tsconfig.json'), '--pretty')['agent.js'];
builtAgent = builtAgent.replace(/function agent\(/, 'function(');
console.log('  '+builtAgent.length+' chars');

console.log('Building noapi...');
var builtNoapi = build.compileTS('--project', path.join(__dirname, 'noapi/tsconfig.json'), '--pretty')['noapi.js'];
console.log('  '+builtNoapi.length+' chars');


console.log('Building isolation host...');
var builtHost = build.compileTS('--project', path.join(__dirname, 'host/tsconfig.json'), '--pretty')['host.js'];
console.log('  '+builtHost.length+' chars');

console.log('Embedding agent/noapi code into host...');
var builtHost_withagent = builtHost.replace('"#workeragent#"', build.jsString(builtAgent)).replace('"#noapi#"', build.jsString(builtNoapi));
console.log('  '+builtHost_withagent.length+' chars');



console.log('Building tests...');
var builtTests = build.compileTS('--project', path.join(__dirname, 'tests/tsconfig.json'), '--pretty')['tests.js'];
console.log('  '+builtTests.length+' chars');

var buildStats = buildStats();


console.log('Combining...');


var template = build.buildTemplate;
var wrapped = build.wrapScript({
    lib: build.functionBody(isolation_lib_content,{
      stats: buildStats,
      host: builtHost_withagent
    }),
    lib_tests: 'isolation();\n'+builtTests,
  	lib_exports: 'isolation();\n'+'module.exports = isolation;'
  });

console.log('Build into '+outputPath+' ('+wrapped.length+' chars), taken '+((buildStats.taken)/1000)+' sec.');
fs.writeFileSync(outputPath, wrapped);



function isolation_lib_content() {

function isolation() {

	isolation.build = "#stats#";

"#host#"

}

}