var fs = require('fs');
var path = require('path');

var build = require('eq80/index.html');
var buildStats = build.buildStats();

var child_process = require('child_process');

runNode(path.resolve(__dirname, './persistence/build.js'), function () {

  console.log('\n');
  runNode(path.resolve(__dirname, './loader/build.js'), function () {

    var loaderBytes = fs.readFileSync(path.resolve(__dirname, './loader/eq80/index.html'));
    var oldLoaderPath = path.resolve(__dirname, './node_modules/eq80/index.html');
    try {
      var oldLoaderBytes = fs.readFileSync(oldLoaderBytes);
    }
    catch (error) { }

    console.log('\n\n\nCopying loader[' + loaderBytes.length + '] to node_modules' + (oldLoaderBytes ? '[' + oldLoaderBytes.length + ']' : '') + '...');
    fs.writeFileSync(
      oldLoaderPath,
      loaderBytes);

    console.log('\n');
    runNode(path.resolve(__dirname, './shell/build.js'), function () {

      var newShellPath = path.resolve(__dirname, './mi.html');
      var newShellBytes = fs.readFileSync(newShellPath);
      var oldShellPath = path.resolve(__dirname, './index.html');
      var oldShellBytes = fs.readFileSync(oldShellPath);

      console.log('\n\n\nCopying shell[' + newShellBytes.length + '] ' + (oldShellBytes ? ' over[' + oldShellBytes.length + ']' : '') + '...');
      fs.writeFileSync(
        oldShellPath,
        newShellBytes);

      fs.unlinkSync(newShellPath);

      console.log('\n\n\nReplacing shell in all');

      console.log('\n');
      runNode([path.resolve(__dirname, './node_modules/eq80/index.html'), '*'], function () {
        console.log('\n\n\nBUILD DONE.');
      });
    });
  });

});

function runNode(script, callback) {
  console.log(process.argv0 + ' ' + (typeof script === 'string' ? script : script.join(' ')));
  var proc = child_process.spawn(process.argv0, typeof script === 'string' ? [script] : script, { stdio: 'inherit' });

  proc.on('exit', function (exitCode) {
    if (!exitCode) callback();
  });
}