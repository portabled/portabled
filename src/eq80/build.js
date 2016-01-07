var buildStart = new Date();

var fs = fs || require('fs');
var ts = ts || require('../imports/ts/typescript.js');


var eq80Script = buildMainScript();

var html = [
  '<!doctype html><head><meta charset="utf-8"><title>mini shell </title>',
  fs.readFileSync('../favicon.base64.html'),
  '<'+'style data-legit=mi> *{display:none;background:black;color:black;} html,body{display:block;background:black;color:black;margin:0;padding:0;height:100%;overflow:hidden;} </'+'style>',
  '</head><body>',
	'<'+'script data-legit=mi>',
  eq80Script,
  'eq80();',
  '//'+'# '+'sourceURL=eq80.js',
  '</'+'script>'
];




fs.writeFileSync('eq80.html', html.join('\n'));



function buildMainScript() {

  console.log('Compiling boot...');
  var boot = compile(['boot', '../persistence/API.d.ts', '../typings/webSQL.d.ts']);

  console.log('Compiling persistence...');
  var persistence = compile(['../persistence', '../typings/webSQL.d.ts']);

  var buildEnd = new Date();

  var result =
      'function eq80() {\n'+

      injectBuildDiagnostics()+'\n\n'+
      'if (typeof noui !== "undefined" && noui) {\n'+
      '  eq80.persistence = persistence;\n'+
      '	persistence(persistence);\n'+
      '  return;\n'+
      '}\n'+


      boot['output.js']+'\n\n'+

      'function persistence(p) {\n'+
      'var persistence = p;\n'+
      persistence['output.js']+'\n'+
      '} // persistence \n\n'+
      '}';

  return result;

  function injectBuildDiagnostics() {

    var platform;
    try { platform = require('nowindow').navigator.userAgent }
    catch (error) {
      platform = 'node '+process.version+' on '+process.platform+'/'+process.arch;
    }

    var result = [
      'eq80.build = {',
      '  timestamp: '+(+buildEnd)+', // ' + buildEnd,
      '  taken: '+(buildEnd - buildStart)+',',
      '  platform: '+(typeof JSON !== 'undefined' && typeof JSON.stringify === 'function' ? JSON.stringify(platform) : '"'+platform+'"'),
      '}'
    ];

    return result.join('\n');
  }

}









function compile(files) {

  var ops = ts.getDefaultCompilerOptions();

  var outputs = {};

  ops.target = ts.ScriptTarget.ES5;
  ops.declaration = true;
  ops.outFile = 'output.js';
  // ops.module = ts.ModuleKind.CommonJS;

  var basehost = ts.createCompilerHost(ops);

  OverrideHost.prototype = basehost;

  var cohost = new OverrideHost();

  cohost.writeFile = function(name, text) {
    outputs[name] = text;
  };

  var expandFiles = dirExpand(files);

  var prog = ts.createProgram(expandFiles, ops, cohost);

  prog.emit();

  var diagnostics = ts.getPreEmitDiagnostics(prog);

  for (var i = 0; i < diagnostics.length; i++) {
    var dg = diagnostics[i];
    if (!dg) continue;
    var pos = dg.file ? ts.getLineAndCharacterOfPosition(dg.file, dg.start) : null;
    if (typeof dg.messageText === 'string') {
      if (pos)
    		console.log(dg.file.fileName, pos.line, pos.character, dg.messageText);
      else
    		console.log('GLOBAL', dg.messageText);
    }
    else {
      if (pos)
      	console.log(dg.file.fileName, pos.line, pos.character);
      else
        console.log('GLOBAL');
      var chain = dg.messageText;
      while (chain) {
        console.log('  '+chain.messageText);
        chain = chain.next;
      }
    }
  }
  if (!diagnostics.length) {
    console.log('compiled with zero problems');
  }
  else if (diagnostics.length>1) {
    console.log(diagnostics.length+' compile messages');
  }

  return outputs;

  function OverrideHost() {}
}

function dirExpand(files, regexp) {
  if (!regexp) regexp = /\.ts$/;
  var result = [];
  for (var i = 0; i < files.length; i++) {
    var fi = files[i];
    var fiStat = fs.statSync(fi);
    if (fiStat.isFile()) {
      if (regexp.test(fi)) result.push(fi);
      continue;
    }

    var list = dirExpand(fs.readdirSync(fi), regexp);
    if (!list.length) continue;
    if (list.length===1) result.push(list[0]);
    else result = result.concat(list);
  }
  //console.log('dirExpand(',files,', '+regexp+'):');
  //console.log(result.length,' ('+exc.length+') skipped: ',exc);
  return result;
}