var fs = require('fs');
var path = require('path');

var build = require('../build.js');
var buildStats = build.buildStats();

// fs.unlinkSync('lib/persistence.js');

var outputPath = path.resolve(__dirname, 'lib/persistence.html')

console.log('Building persistence TypeScript...');
var builtContent = build.compileTS('--project', path.join(__dirname, 'src/tsconfig.json'), '--pretty')['persistence.js'];
console.log('  '+builtContent.length+' chars');

console.log('Building tests TypeScript...');
var builtTests = build.compileTS('--project', path.join(__dirname, 'tests/tsconfig.json'), '--pretty')['persistence-tests.js'];
console.log('  '+builtTests.length+' chars');

var buildStats = buildStats();


console.log('Combining...');


var wrapped = build.wrapScript({
    lib: build.functionBody(persistence_lib_content,{
      stats: buildStats,
      persistence: builtContent
    }),
    lib_tests: 'persistence();\n'+builtTests,
  	lib_exports: 'persistence();\n'+'module.exports = persistence;'
  });

console.log('Build into '+outputPath+' ('+wrapped.length+' chars), taken '+((buildStats.taken)/1000)+' sec.');
fs.writeFileSync(outputPath, wrapped);



function persistence_lib_content() {
function persistence(document, uniqueKey, optionalDrives) {

	persistence.build = "#stats#"

"#persistence#"


  persistence.formatTotalsInner = formatTotalsInner;
  persistence.formatDate = DOMTotals.formatDate;
  persistence.formatSize = DOMTotals.formatSize;
  persistence.formatFileInner = formatFileInner;
  persistence.parseTotalsInner = parseTotalsInner;
  persistence.parseFileInner = parseFileInner;
  persistence.parseHTML = parseHTML;
  persistence.attached = attached;
  if (document) return new BootState(document, uniqueKey, optionalDrives); else return persistence;
}
}