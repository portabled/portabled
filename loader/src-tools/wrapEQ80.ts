declare var persistence, loader;

declare namespace wrapEQ80 {

  type Options = {
    title: string;
    early_html: string;
    boot_html: string;
    shell_html: string;
    delayed_shell_html?: string;
    files: string[] | { [file: string]: any; };
    timestamp: number;
    defaultBackground: string;
    favicon: string;
  	fileTotalSize: number;
  	fileTotalCount: number;
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

  return ''+
    '<!doctype html><head><meta charset="utf-8"><title> '+(options.title||'mini shell')+' </title>\n'+
    '<meta http-equiv="x-ua-compatible" content="IE=edge">'+
    totalsComment+'\n'+
    (options.favicon||'')+'\n'+
    '<HTA:APPLICATION id="htaHeader" SINGLEINSTANCE="no"></HTA:APPLICATION>'+
    '<style data-legit=mi> *{display:none;'+backgroundStyle+'} html,body{display:block;'+backgroundStyle+'margin:0;padding:0;height:100%;overflow:hidden;} </style>\n'+
    '</head><body>\n'+
    '<'+'script data-legit=mi>\n'+
    loader+'\n\n\n'+
    persistence+'\n\n\n'+
    'loader(window, document); //# sourceURL=/EQ80.js\n'+
    '</'+'script>\n'+
    (options.early_html?options.early_html:'')+

    '<'+'script data-legit=mi> // pushing BOOT\n'+
    '(function(doc) {\n'+
    '  if (doc.open) doc.open();\n'+
    '  doc.write('+jsStringLong(options.boot_html)+');\n'+
    '  if (doc.close) doc.close();\n'+
    '})(loader.boot.contentWindow.document || loader.boot.window.document);\n'+
    'loader.boot.style.display="block"; //# '+'sourceURL=/BOOT-docwrite.html\n'+
    '</'+'script>\n'+

    (options.shell_html ?
     '<'+'script data-legit=mi> // pushing SHELL\n'+
     '(function(doc) {\n'+
     '  if (doc.open) doc.open();\n'+
     '  doc.write('+jsStringLong(options.shell_html)+');\n'+
     '  if (doc.close) doc.close();\n'+
     '})(loader.shell.contentWindow.document || loader.shell.window.document); //# '+'sourceURL=/SHELL-docwrite.html\n'+
     '</'+'script>\n'
     : '')+

    (options.delayed_shell_html ?
     '<'+'script data-legit=mi> // pushing SHELL: delayed\n'+
     'loader.delayed_shell_html = (function() {\n'+
     '  var doc = loader.shell.contentWindow.document || loader.shell.window.document;\n'+
     '  return delayed_shell_html;\n'+
     '  function delayed_shell_html() {\n'+
     '    if (doc.open) doc.open();\n'+
     '    doc.write('+jsStringLong(options.delayed_shell_html)+');\n'+
     '    if (doc.close) doc.close();\n'+
     '  }\n'+
     '})(); //# '+'sourceURL=/SHELL-docwrite.html\n'+
     '</'+'script>\n'
     : '')+

    fileTotalHTML+
    '</body></html>';
}
