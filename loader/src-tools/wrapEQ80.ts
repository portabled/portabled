declare var persistence, loader;

declare namespace wrapEQ80 {

  type Options = {

    /** Wrapper document's title */
    title?: string;

    /** Wrapper document can have a chunk of HTML embedded directly */
    early_html?: string;

    /** During document/content load a temporary IFRAME is created to cover the whole of the page, and this content will be injected there */
    boot_html: string;

    /** Upon document load complete, a long-term IFRAME is created to render actual UI, and this content will be injected */
    shell_html: string;

    delayed_shell_html?: string;

    /** Files to populate */
    files: string[] | { [file: string]: any; };

    timestamp: number;

    /** CSS background value */
    defaultBackground: string;

    /** header injection */
    favicon?: string;

    /** value to be populated AFTER wrap complete */
    fileTotalSize?: number;

    /** value to be populated AFTER wrap complete */
  	fileTotalCount?: number;
  };
}

function wrapEQ80(options: wrapEQ80.Options) {

  var fileTotalHTML='';
  var fileTotalSize = 0;
  var fileTotalCount = 0;

  var fdir = getFiles(options.files);
  var fileList = fdir.files();

  for (var i = 0; i < fileList.length; i++) {
    var n = persistence.formatFileInner(fileList[i], fdir.read(fileList[i]));
    var sz = n.length - n.indexOf('\n') - 1; // size is counted only for content
    fileTotalSize += sz;
    fileTotalCount++;
    fileTotalHTML=fileTotalHTML?fileTotalHTML+'\n<!--'+n+'-->':'<!--'+n+'-->';
  }

  options.fileTotalSize = fileTotalSize;
  options.fileTotalCount = fileTotalCount;
  var totalsComment = '<!--'+persistence.formatTotalsInner(options.timestamp || +new Date(), fileTotalSize)+'-->';

  var backgroundStyle = options.defaultBackground||'background:black;color:black;';

  var result = ''+
    '<!doctype html><meta charset="utf-8"><title>'+(options.title||'mini shell')+' </title> '+
    '<meta http-equiv="x-ua-compatible" content="IE=edge"><style data-legit=mi> *{display:none;'+backgroundStyle+'} html,body{display:block;'+backgroundStyle+'margin:0;padding:0;height:100%;overflow:hidden;color:transparent;} </style>\n'+
    totalsComment+
    (options.favicon ? '// '+options.favicon + '\n': '') +
    //'<HTA:APPLICATION id="htaHeader" SINGLEINSTANCE="no"></HTA:APPLICATION>'+
    '<'+'script data-legit=mi> /* EQ80 */\n'+
    loader+'\n\n\n'+
    persistence+'\n\n\n'+
    'loader(window, document); //# sourceURL=/EQ80.js </'+'script>\n'+
    (options.early_html?options.early_html:'')+

    '<'+'script data-legit=mi> /* BOOT frame */ \n'+
    '(function(doc) {\n'+
    '  if (doc.open) doc.open();\n'+
    '  doc.write('+jsStringLong(options.boot_html)+');\n'+
    '  if (doc.close) doc.close();\n'+
    '})(loader.boot.contentWindow.document || loader.boot.window.document);\n'+
    'loader.boot.style.display="block"; //# '+'sourceURL=/BOOT-docwrite.html </'+'script>\n'+

    (options.shell_html ?
     '<'+'script data-legit=mi> /* SHELL frame */ \n'+
     '(function(doc) {\n'+
     '  if (doc.open) doc.open();\n'+
     '  doc.write('+jsStringLong(options.shell_html)+');\n'+
     '  if (doc.close) doc.close();\n'+
     '})(loader.shell.contentWindow.document || loader.shell.window.document); //# '+'sourceURL=/SHELL-frame.html\n'+
     '//</'+'script>\n'
     : '')+

    (options.delayed_shell_html ?
     '<'+'script data-legit=mi> /* SHELL: delayed */ \n'+
     'loader.delayed_shell_html = (function() {\n'+
     '  var doc = loader.shell.contentWindow.document || loader.shell.window.document;\n'+
     '  return delayed_shell_html;\n'+
     '  function delayed_shell_html() {\n'+
     '    if (doc.open) doc.open();\n'+
     '    doc.write('+jsStringLong(options.delayed_shell_html)+');\n'+
     '    if (doc.close) doc.close();\n'+
     '  }\n'+
     '})(); //# '+'sourceURL=/SHELL-delayed.html </'+'script>\n'
     : '')+

    '/*'+fileTotalHTML+'*/';

  checkBlownLines(result);

  return result;

}

function checkBlownLines(html: string, _console?: typeof console) {
  if (!_console) _console = console;

  const i: { alert: string } = null;
  var lines = html.split('\n');
  var strangeLines: string[] = [];
  var strangeStretches: { start: number, length: number, char: string }[] = [];
  for (var iLine = 0; iLine < lines.length; iLine++) {
    var ln = lines[iLine];
    if (ln.length > 200) {
      var highCount = 0;
      var firstBreak = -1;
      for (var iChar = 0; iChar < ln.length; iChar++) {
        if (ln.charCodeAt(iChar) > 126) {
          if (firstBreak < 0)
            firstBreak = iChar;
          highCount++;
        }
      }

      if (highCount > ln.length * 0.3) {
        strangeLines[iLine] = iChar + ':' + ln.slice(Math.max(0, firstBreak - 10), firstBreak + 10);
        continue;
      }
    }

    if (strangeLines[iLine - 1]) {
      var foundStretch = false;
      for (var iStretchLine = iLine; iStretchLine >= 0; iStretchLine--) {
        if (!strangeLines[iStretchLine - 1]) {
          strangeStretches.push({ start: iStretchLine, length: iLine - iStretchLine, char: strangeLines[iStretchLine] });
          foundStretch = true;
          break;
        }
      }
      if (!foundStretch) {
        strangeStretches.push({ start: iLine, length: 1, char: strangeLines[iLine] });
      }
    }
  }

  if (strangeStretches.length) {
    _console.log('Unusually long lines with many non-ASCII symbols' + (strangeStretches.length > 1 ? ' (' + strangeStretches.length + ' separate places)' : '') + ':');
    for (var iStretch = 0; iStretch < strangeStretches.length; iStretch++) {

      if (iStretch) _console.log('');
      var stret = strangeStretches[iStretch];
      var leadLength = Math.min(stret.start, 4);
      var trailLength = 4;
      for (var iLineBefore = 0; iLineBefore < leadLength; iLineBefore++) {
        var lnum = stret.start - leadLength + iLineBefore;
        if (lines[lnum].length > 80)
          _console.log('[' + lnum + '] ' + lines[lnum].slice(0, 50) + ' ... ' + lines[lnum].slice(-20) + '[EOL]');
        else
          _console.log('[' + lnum + '] ' + lines[lnum] + '[EOL]');
      }

      for (var iLine = 0; iLine < stret.length; iLine++) {
        var lnum = stret.start + iLine;
        _console.log('*' + lnum + '* ' + stret.char + ' ' + lines[lnum].slice(0, 50) + ' ... ' + lines[lnum].slice(-50) + '[EOL]');
      }

      for (var iLineAfter = 0; iLineAfter < trailLength; iLineAfter++) {
        var lnum = stret.start + stret.length + iLineAfter;
        if (lnum > lines.length) break;
        if (iLineAfter + 1 < strangeStretches.length && lnum >= strangeStretches[iLineAfter + 1].start - 3) break;
        if (lines[lnum].length > 80)
          _console.log('[' + lnum + '] ' + lines[lnum].slice(0, 50) + ' ... ' + lines[lnum].slice(-50) + '[EOL]');
        else
          _console.log('[' + lnum + '] ' + lines[lnum] + '[EOL]');
      }
    }
  }
}
