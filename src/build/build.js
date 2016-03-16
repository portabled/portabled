var buildStart = new Date();

var fs = require('fs');
var path = require('path');
var eq80 = require('../eq80');

var html = [];

console.log('Combining boot pack...');
var bootUI = fs.readFileSync('boot.html')+'';

var ui = fs.readFileSync('ui.html')+'';

ui = ui.
  replace(/#on-error#/, fs.readFileSync('../shell/onerror.js')+'').
  replace(/#cm-style#/, (fs.readFileSync('../imports/cm/cm.css')+'').replace(/\$/g, '$$$$')).
  replace(/#cm-script#/, (fs.readFileSync('../imports/cm/cm.js')+'').replace(/\$/g, '$$$$'));



console.log('Compiling shell...');
var shellCore = eq80.compile([
  '../shell',
  '../typings',
  '../persistence/API.d.ts',
  '../isolation/noapi', '../isolation/Context.ts'
])['output.js'];

ui = ui.
	replace(/#shell-script#/, shellCore);


console.log('Detecting platform...');
var platform;
try { platform = require('nowindow').navigator.userAgent }
catch (error) {
  platform = 'node '+process.version+' on '+process.platform+'/'+process.arch;
}

var cssFiles = eq80.dirExpand(['../shell'], /\.css$/);
for (var i = 0; i < cssFiles.length; i++) {
  cssFiles[i] = (fs.readFileSync(cssFiles[i])+'');
}

ui = ui.
	replace(/#shell-style#/, cssFiles.join('\n'));

console.log('Preparing src...');
var srcFiles = eq80.dirExpand(['..'], /.*/);
var srcLead = path.resolve('../..');
if (/\/$/.test(srcLead)) srcLead = srcLead.slice(0, srcLead.length-1);

var srcTotalSize = 0;
for (var i = 0; i < srcFiles.length; i++) {
  var fi = new eq80.persistence.dom.DOMFile(/*node*/null, srcFiles[i].slice(srcLead.length), null, 0, 0);
  var srcContent = fs.readFileSync(srcFiles[i])+'';
  var fiHTML = '<'+'!-- '+fi.write(srcContent) + '--'+'>';
  srcTotalSize += srcContent.length;
  srcFiles[i] = fiHTML;
}

var miBuildDate = new Date();

console.log('Encoding build date and summary: '+miBuildDate+'...');
var totalsComment = '<'+'!-- '+ (new eq80.persistence.dom.DOMTotals(miBuildDate, srcTotalSize, /*node*/null)).updateNode() + ' --'+'>\n';
var totalsCommentEmpty = '<'+'!-- '+ (new eq80.persistence.dom.DOMTotals(miBuildDate, 0, /*node*/null)).updateNode() + ' --'+'>\n';
html.push(
  '<!doctype html><head><meta charset="utf-8"><title> mini shell </title>\n'+
  '<meta http-equiv="x-ua-compatible" cpmtemt="IE=edge">');
html.push(totalsComment);
html.push(
    fs.readFileSync('favicon.base64.html')+
    '<HTA:APPLICATION id="htaHeader" SINGLEINSTANCE="no"></HTA:APPLICATION>'+
    '<style data-legit=mi> *{display:none;background:black;color:black;} html,body{display:block;background:black;color:black;margin:0;padding:0;height:100%;overflow:hidden;} </style>\n'+
    '</head><body>\n'+
    '<'+'script data-legit=mi>\n'+
  	eq80.script);


console.log('Merging shell pack...');
ui = ui.
  replace(/\#built\#/, (+miBuildDate).toString()).
  replace(/\#builtStr\#/, miBuildDate.toString()).
  replace(/\#taken\#/, (miBuildDate - buildStart).toString()).
  replace(/\#style\#/, eq80.jsString(cssFiles.join('\n'))).
  replace(/\#cm-style\#/, eq80.jsString(fs.readFileSync('../imports/cm/cm.css')+'')).
  replace(/\#platform\#/, eq80.jsString(platform.toString()));

var minishellScript =
  	'function minishell() { \n'+
    '(function(doc) {\n'+
    'if (doc.open) doc.open();\n'+
    'doc.write('+eq80.jsStringLong(bootUI) +');\n'+
    'if (doc.close) doc.close(); })((eq80.boot.contentWindow||eq80.boot.window).document);\n'+
    '\n\n'+
    'function initUI() {\n\n'+
    '  function dumpToDoc() {\n'+
    '    if (doc.open) doc.open();\n'+
    '    var htmlText='+eq80.jsStringLong(ui)+';\n'+
    '		 doc.write(htmlText);\n'+
    '  	 if (doc.close) doc.close();\n'+
    '  }\n\n\n'+
    '  if (!initUI_interval || typeof eq80==="undefined" || !eq80.ui) return;\n'+
    '  clearInterval(initUI_interval);\n'+
    '  initUI_interval = null;\n'+
    '  document.title = "/ / .";\n'+
    '  var doc = (eq80.ui.contentWindow || eq80.ui.window).document;\n'+
    '  document.title = "/ / :";\n'+
    '  dumpToDoc();\n'+
    '  document.title = "/ / :.";\n'+
    '}\n\n'+
    'var initUI_interval = setInterval(initUI, 10);\n'+
    'eq80.on("load", initUI);\n'+
  '};\n'+
  'minishell();';

html.push(
  minishellScript+
 	'//'+'# '+'sourceURL=/eq80_minishell.js\n'+
  '</'+'script>');

var smallHtmlClone = html.slice(0);
smallHtmlClone[1] = totalsCommentEmpty;
var smallHtml = smallHtmlClone.join('\n');
fs.writeFileSync('../../empty.html', smallHtml);
console.log('Saved '+smallHtml.length+' characters in '+path.resolve('../../empty.html'));

var link = eq80.createLink('empty.html', html);
if (typeof link!=='string') {
  console.log('Open built empty shell ('+smallHtml.length+' characters) in new window: ', link);
}


console.log('Sample/dummy files...');
html.push(fs.readFileSync('dummy.html')+'');


html = html.concat(srcFiles);

var link = eq80.createLink('mi.html', html);
var totalHtml = html.join('\n');
if (typeof link==='string') {
  fs.writeFileSync('../mi.html', totalHtml);
  console.log('Saved '+totalHtml.length+' characters in '+path.resolve('../mi.html')+' /src '+srcTotalSize);
}
else {
  console.log('Open built result ('+totalHtml.length+' characters) in new window: ', link, ' /src '+srcTotalSize);
}

