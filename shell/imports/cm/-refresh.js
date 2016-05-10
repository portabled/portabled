var importgh = require('/src/imports/importgh.js');

var jsFiles = [
  '/lib/codemirror.js',
  '/addon/dialog/dialog.js',
  '/addon/search/search.js',
  '/addon/search/searchcursor.js',
  '/addon/search/jump-to-line.js',
  '/addon/hint/show-hint.js',
  '/addon/lint/lint.js',
  '/mode/javascript/javascript.js',
  '/addon/tern/tern.js',
  '/addon/hint/javascript-hint.js',
  '/mode/css/css.js',
  '/addon/hint/css-hint.js',
  '/addon/mode/multiplex.js',
  '/mode/sass/sass.js',
  '/mode/xml/xml.js',
  '/addon/hint/xml-hint.js',
  '/mode/htmlmixed/htmlmixed.js',
  '/mode/htmlembedded/htmlembedded.js',
  '/addon/hint/html-hint.js',
  '/mode/markdown/markdown.js',
  '/addon/edit/matchbrackets.js',
  '/addon/selection/active-line.js',
  '/addon/edit/trailingspace.js',
  '/addon/fold/foldcode.js',
  '/addon/fold/foldgutter.js',
  '/addon/fold/brace-fold.js',
  '/addon/fold/comment-fold.js',
  '/addon/fold/markdown-fold.js',
  '/addon/fold/xml-fold.js'
  // ,
  // '/addon/merge/merge.js'
];

var cssFiles = [
  '/lib/codemirror.css',
  '/addon/hint/show-hint.css',
  '/addon/lint/lint.css',
  '/addon/dialog/dialog.css',
  //  '/addon/merge/merge.css',
  '/addon/fold/foldgutter.css',

  '/theme/rubyblue.css'
];


importgh.loadFilesTo('codemirror', 'codemirror', jsFiles, 'cm.js');
importgh.loadFilesTo('codemirror', 'codemirror', cssFiles, 'cm.css');
