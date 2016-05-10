var fs = require('fs');
var path = require('path');

var build = require('../build.js');
var buildStats = build.buildStats();

var collectFileCount = 0;

console.log('Building shell TypeScript...');
var builtContent = build.compileTS('--project', 'src/tsconfig.json', '--pretty')['../lib/shell.js'];
console.log('  '+builtContent.length+' chars');

console.log('Processing boot/ui templates...');
var boot_html = fs.readFileSync('boot.html')+'';
var ui_template = fs.readFileSync('ui.html')+'';

var concatCSS = getCSS();
var collectFiles = getFiles();
var cm_style = fs.readFileSync('imports/cm/cm.css');
var cm_script = fs.readFileSync('imports/cm/cm.js');
var shell_script = ''+
    require('../isolation/lib/isolation.html')+'\n'+
    'isolation();\n\n'+
    builtContent;

var buildStats = buildStats();
console.log('  '+collectFileCount+' files, '+concatCSS.length+' chars shell CSS, '+cm_script.length+' chars CodeMirror script, '+cm_style.length+' chars CodeMirror style.');

console.log('Combining SHELL...');
var shell_html = build.substitute(ui_template, {
  stats: buildStats,
  on_error: '',
  cm_style: cm_style,
  cm_script: cm_script,
  shell_style: concatCSS,
  shell_script: shell_script
});
console.log('  '+shell_html.length+' chars');

console.log('Combining HTML...');
var html = build.wrapEQ80({
  boot_html: boot_html,
  shell_html: shell_html,
  files: collectFiles,
  favicon: fs.readFileSync('favicon.base64.html')
});
console.log('  '+html.length+' chars, taken '+((buildStats.taken)/1000)+' sec.');

var link = build.createLink('mi.html', html);
if (typeof link==='string') {
  fs.writeFileSync('../mi.html', html);
  console.log('Saved in '+path.resolve('../mi.html'));
}
else {
  console.log('Open built result in new window: ', link);
}


function getCSS() {
  var toAdd = [path.resolve('src')];
  var css = '';
  while (toAdd.length) {
    var dir = toAdd.pop();
    var childFiles=fs.readdirSync(dir);
    for (var i =0; i < childFiles.length; i++) {
      var f = childFiles[i];
      if (f==='.' || f==='..') continue;
      f = path.join(dir,f);
    	if (fs.statSync(f).isDirectory()) {
        toAdd.push(f);
      }
      else if (/\.css$/.test(f)) {
        css += fs.readFileSync(f)+'\n\n\n';
      }
    }
  }
  return css;
}

function getFiles() {
  return ['/'];
}