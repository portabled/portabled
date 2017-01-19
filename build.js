var fs = require('fs');
var path = require('path');

var build = require('./lib/eq80.html');

var combineOnly = process.argv[2]==='--combine';

var totalBuildStats = build.buildStats();

console.log('Building ALL of it:');
console.log('============');
console.log('\n');
console.log('PERSISTENCE');
console.log('------------');
require('./persistence/build.js');
console.log('\n');
console.log('LOADER');
console.log('------------');
//setTimeout(function() {
require('./loader/build.js');
console.log('\n');

console.log('\n');
console.log('ISOLATION');
console.log('=======');
require('./isolation/build.js');

console.log('SHELL');
console.log('------------');
require('./shell/build.js');
console.log('\n');


totalBuildStats = totalBuildStats();
console.log(totalBuildStats);
