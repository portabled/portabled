declare var Uglify2: any;

module portabled.build.functions {

  var cache: { [key: string]: { input: string; output: string; }; } = {};

  export function uglifyJS(...inputs: string[]): any {
    var inputsCore: string[] = [];
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i] && typeof inputs[i] !== 'string' && typeof inputs[i].length === 'number')
        inputsCore = inputsCore.concat(inputs[i]);
      else
        inputsCore.push(inputs[i]);
    }

    return uglifyJSCore(inputsCore);
  }

  function uglifyJSCore(inputs: string[]): any {
    var inputParts: string[] = [];
    var inputTexts: string[] = [];

    for (var i = 0; i < inputs.length; i++) {
      inputParts[i] = inputTexts[i] = inputs[i];
      if (inputs[i].length < 200 && inputs[i].indexOf('\n') < 0) {
        var norm = files.normalizePath(inputs[i]);
        var inputText = processTemplate.mainDrive.read(norm);
        if (typeof inputText === 'string') {
          inputParts[i] = norm;
          inputTexts[i] = inputText;
        }
      }
    }

    var key = '{uglifyJS}' + murmurhash2_32_gc(inputParts.join(','), '23');
    var input = inputTexts.join('\n');

    if (!uglifyJS.skip && cache.hasOwnProperty(key) && cache[key].input === input)
      return cache[key].output;

    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage) {
        var sessionCached = sessionStorage.getItem ? sessionStorage.getItem(key) : sessionStorage[key];
        if (sessionCached && typeof sessionCached === 'string') {
          var cacheItem = JSON.parse(sessionCached);
          if (cacheItem.input === input)
            return cacheItem.output;
        }
      }
    }
    catch (sessionError) {
    }

    var asyncFn: any = () => {
      var output = uglifyText(input);

      if (!uglifyJS.skip) {
        cache[key] = { input, output };

        try {
          if (typeof sessionStorage !== 'undefined' && sessionStorage) {
            if (sessionStorage.setItem)
              sessionStorage.setItem(key, JSON.stringify({ input, output }));
          }
        }
        catch (sssionError) {
        }
      }

      return output;
    };
    asyncFn.toString = () => 'uglify('+(key.length > 50 || key.indexOf('\n') ? key.replace(/\n/g, ' ').slice(0,48)+'...' : key)+')';

    return asyncFn;
  }

  function uglifyText(text: string) {

    if (uglifyJS.skip) {
      if (typeof console !== 'undefined' && typeof console.log === 'function')
        console.log('uglifyText(' + JSON.stringify(text.slice(0, Math.min(text.length, 20))) + ') skipping to plain text');
      return text;
    }

    var ast = Uglify2.parse(text, {});
    ast.figure_out_scope();

    var compressor = new Uglify2.Compressor({
      sequences: true,
      properties: true,
      dead_code: true,
      drop_debugger: true,
      unsafe: false,
      unsafe_comps: false,
      conditionals: true,
      comparisons: true,
      evaluate: true,
      booleans: true,
      loops: true,
      unused: true,
      hoist_funs: true,
      hoist_vars: false,
      if_return: true,
      join_vars: true,
      cascade: true,
      side_effects: true,
      negate_iife: true,
      screw_ie8: false,

      warnings: true,
      global_defs: {}
    });

    var compressed = ast.transform(compressor);

    compressed.figure_out_scope();
    compressed.compute_char_frequency();
    compressed.mangle_names();

    var result = compressed.print_to_string({
      quote_keys: false,
      space_colon: true,
      ascii_only: false,
      inline_script: true,
      max_line_len: 1024,
      beautify: false,
      source_map: null,
      bracketize: false,
      semicolons: true,
      comments: /@license|@preserve|^!/,
      preserve_line: false,
      screw_ie8: false
    });

    if (typeof console !== 'undefined' && typeof console.log === 'function')
      console.log('uglifyText(' + JSON.stringify(text.slice(0, Math.min(text.length, 20))) + ') resulted in ' + result.lengh + ' chars (' + (result.length * 100 / text.length) + '% original)');

    return result;
  }

  export module uglifyJS {

    export var skip: boolean;

  }

}