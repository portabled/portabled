var fs = require('fs');
var path = require('path');

var build = require('../build.js');
var buildStats = build.buildStats();


console.log('Building shell TypeScript...');
var builtContent = build.compileTS('--project', path.join(__dirname, 'src/tsconfig.json'), '--pretty')['shell.js'];
console.log('  '+builtContent.length+' chars');

console.log('Processing boot/ui templates...');
var boot_html = readLocal('boot.html')+'';
var ui_template = readLocal('ui.html')+'';

var concatCSS = getCSS();
var cm_style = readLocal('imports/cm/cm.css');
var cm_script = readLocal('imports/cm/cm.js');
var shell_script = ''+
    require('../isolation/lib/isolation.html')+'\n'+
    'isolation();\n\n'+
    builtContent;

var buildStats = buildStats();
console.log('  '+concatCSS.length+' chars shell CSS, '+cm_script.length+' chars CodeMirror script, '+cm_style.length+' chars CodeMirror style.');

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

console.log('Combining full HTML...');
var miOpts = {
  boot_html: boot_html,
  shell_html: shell_html,
  files: ['/'],
  favicon: readLocal('favicon.base64.html')
};

var html = build.wrapEQ80(miOpts);

var link = build.createLink('mi.html', html);
if (typeof link==='string') {
  fs.writeFileSync(path.join(__dirname, '../mi.html'), html);
  console.log('Built  '+html.length+' chars ('+miOpts.fileTotalCount+' files), taken '+((buildStats.taken)/1000)+' sec. into: '+path.resolve(__dirname, '../mi.html'));
}
else {
  console.log('Built  '+html.length+' chars ('+miOpts.fileTotalCount+' files), taken '+((buildStats.taken)/1000)+' sec. into: ', link);
}


console.log('Combining empty HTML...');
var html_empty = build.wrapEQ80({
  boot_html: boot_html,
  shell_html: shell_html,
  files: { "/readme.md": readLocal('readme.md') },
  favicon: readLocal('favicon.base64.html')
});

var link = build.createLink('empty.html', html_empty);
if (typeof link==='string') {
  fs.writeFileSync(path.join(__dirname, '../empty.html'), html_empty);
  console.log('Built  '+html_empty.length+' chars into: '+path.resolve(__dirname, '../empty.html'));
}
else {
  console.log('Built  '+html_empty.length+' chars into: ', link);
}




function getCSS() {
  var fdir = build.getFiles(path.resolve(__dirname, 'src'));
  var srcFiles = fdir.files();
  var css = '';
  for (var i = 0; i < srcFiles.length; i++) {
    if  (/\.css$/.test(srcFiles[i])) {
      css += fdir.read(srcFiles[i])+'\n\n\n';
    }
  }
  return css;
}

function readLocal(f) {
  // to work in require(build) manner
  return fs.readFileSync(path.join(__dirname, f));
}