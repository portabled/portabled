declare var UglifyCSS: any;

module portabled.build.functions {

  var cache: { [key: string]: { input: string; output: string; }; } = {};

  export function uglifyCSS(...inputs: string[]): any {
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


    var key = '{uglifyCSS}' + murmurhash2_32_gc(inputParts.join(','), 23);
    var input = inputTexts.join('\n');

    if (cache.hasOwnProperty(key) && cache[key].input === input)
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
      cache[key] = { input, output };

      try {
        if (typeof sessionStorage !== 'undefined' && sessionStorage) {
          if (sessionStorage.setItem)
            sessionStorage.setItem(key, JSON.stringify({ input, output }));
        }
      }
      catch (sessionError) {
      }

      return output;
    };
    asyncFn.toString = () => 'uglifyCSS(' + (key.length > 50 || key.indexOf('\n') ? key.replace(/\n/g, ' ').slice(0, 48) + '...' : key) + ')';
    return asyncFn;
  }

  function uglifyText(text: string) {
    var result = UglifyCSS.processString(text, {});

    return result;
  }

}