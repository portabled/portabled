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
  replace(/#cm-script#/, (fs.readFileSync('../imports/cm/cm.js')+'').replace(/\$/g, '$$$$')).
  replace(/#ts-script#/, (fs.readFileSync('../imports/ts/typescript.js')+'').replace(/\$/g, '$$$$'));



console.log('Compiling shell...');
var shellCore = eq80.compile([
  '../shell',
  '../typings',
  '../persistence/API.d.ts',
  '../isolation/noapi', '../isolation/Context.ts',
  '../imports/ts/typescriptServices.d.ts'
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
  var fiHTML = '<'+'!-- '+fi.write(fs.readFileSync(srcFiles[i])+'') + '--'+'>';
  srcTotalSize += fiHTML.length;
  srcFiles[i] = fiHTML;
}

var miBuildDate = new Date();

console.log('Encoding build date and summary: '+miBuildDate+'...');
var totalsComment = '<'+'!-- '+ (new eq80.persistence.dom.DOMTotals(miBuildDate, srcTotalSize, /*node*/null)).updateNode() + ' --'+'>\n';
html.unshift(eq80.html.replace(/\<\/title\>/, '<'+'/title>' + totalsComment));

console.log('Merging shell pack...');
ui = ui.
  replace(/\#built\#/, (+miBuildDate).toString()).
  replace(/\#builtStr\#/, miBuildDate.toString()).
  replace(/\#taken\#/, (miBuildDate - buildStart).toString()).
  replace(/\#style\#/, eq80.jsString(cssFiles.join('\n'))).
  replace(/\#cm-style\#/, eq80.jsString(fs.readFileSync('../imports/cm/cm.css')+'')).
  replace(/\#platform\#/, eq80.jsString(platform.toString()));

html.push(
	'<'+'script id=bootui data-legit=mi>\n'+
  '(function(doc) {\n'+
  'if (doc.open) doc.open();\n'+
  'doc.write('+eq80.jsStringLong(bootUI) +');\n'+
  'if (doc.close) doc.close(); })((eq80.boot.contentWindow||eq80.boot.window).document);\n'+
  '</'+'script>\n'+
	'<'+'script id=shellui data-legit=mi>\n'+
  'var initUI_interval = setInterval(initUI, 10);\n'+
  'eq80.on("load", initUI); \n'+
  'function initUI() {\n'+
  '  if (!initUI_interval || typeof eq80==="undefined") return;\n'+
  '  clearInterval(initUI_interval);\n'+
  '  initUI_interval = null;\n'+
  '  (function(doc) {\n'+
  '    if (doc.open) doc.open();\n'+
  '    var htmlText='+eq80.jsStringLong(ui)+';\n'+
  '		 doc.write(htmlText);\n'+
  '  	 if (doc.close) doc.close(); })((eq80.ui.contentWindow || eq80.ui.window).document);\n'+
  '}//'+'# '+'sourceURL=ui.html\n'+
  '</'+'script>');

console.log('Sample/dummy files...');
html.push(fs.readFileSync('dummy.html')+'');


html = html.concat(srcFiles);

var link = eq80.createLink('mi.html', html);
var totalHtml = html.join('\n');
if (typeof link==='string') {
  fs.writeFileSync('../mi.html', totalHtml);
  console.log('Saved '+totalHtml.length+' characters in '+path.resolve('../mi.html'));
}
else {
  console.log('Open built result ('+totalHtml.length+' characters) in new window: ', link);
}

