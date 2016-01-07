var importgh = require('../importgh.js');
console.log(importgh);

var libFiles = [
  'tsc.js',
  'lib.d.ts',
  'typescript.js',
  'typescriptServices.d.ts'
];

for (var i = 0; i < libFiles.length; i++) {
  importgh.loadFilesTo(
    'microsoft', 'typescript',
    ['/lib/'+libFiles[i]],
    '/src/imports/ts/'+libFiles[i]);
}