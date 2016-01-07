module shell.build {

  export function processTemplate(
    template: string, scopes: any[],
    evalFn,
    log: (logText: string) => void,
    callback: (error: Error, result?: string) => void,
    continueWith: (action: () => void) => void): void {
    // < %= expr % >
    // < % statement % >
    // < %-- comment --% >

    log('Generating build script...');

    var fnText = generateBuildScript(template, scopes);

    log('Executing build script...');

    try {
      var fnMake = evalFn(
        '(function(){ return function(scopes, catcher) { try { ' +
        fnText +
        ' } catch (err) { '+
        '		var err1 = {}; for (var k in err) { err1[k] = err[k]; } if (err.stack) err1.stack = err.stack; catcher(err1); '+
        ' } }; '+
        ' })()');

      var transmitErr;
      var output: any[] = fnMake(scopes, function(catchErr) { transmitErr = catchErr; });
      var outputIndex = 0;
    }
    catch (error) {
      log('Build failure ' + error);
      callback(error);
      return;
    }

    if (transmitErr) {
      log('Build failure ' + transmitErr);
      callback(transmitErr);
      return;
    }

    processNextOutputChunk();

    function processNextOutputChunk() {
      var processUntilNextSlice = 3000;
      var startTime = +new Date();

      // all heavy chunks will bail out and queue the next one on continueWith,
      // simple literal insertions keep going for a slice of time
      while (true) {
        if (outputIndex >= output.length) {
          var result = output.join('');
          callback(null, result);
          return;
        }

        var outputChunk = output[outputIndex];
        if (typeof outputChunk === 'function') {
          if (outputChunk._name)
            log('<' + '%=' + outputChunk._name + '%'+'>...');
          else
            log('Processing instruction...');

          //continueWith(() => {
          try {
            var chunkResult = outputChunk();
            var literal = String(chunkResult);
          }
          catch (error) {
            callback(error);
            return;
          }

          log('...OK [' + literal.length + ']');
          collectChunk(literal);

          // //processNextOutputChunk();
          //continueWith(processNextOutputChunk, 1);
          //});
          //break;
        }
        else {
          var literal = String(outputChunk);
          collectChunk(literal);

          var now = +new Date();
          if (now - startTime > processUntilNextSlice) {
            continueWith(processNextOutputChunk);
            break;
          }
          // keep going if haven't been processing for long yet
        }
      }
    }

    function collectChunk(literal: string) {
      output[outputIndex] = literal;
      outputIndex++;
    }



  }

  function generateBuildScript(template: string, scopes: any[]): string {
    var generated: string[] = [];
    for (var i = 0; i < scopes.length; i++) {
      generated.push('with(scopes[' + i + ']) {');
    }

    generated.push('var output =[];');

    var index = 0;
    while (index < template.length) {

      var nextOpenASP = template.indexOf('<'+'%', index);
      if (nextOpenASP < 0) {
        generateWrite(generated, template.slice(index));
        break;
      }

      var ch = template.charAt(nextOpenASP + 2);
      if (ch === '=') {
        var closeASP = template.indexOf('%'+'>', nextOpenASP);
        if (closeASP < 0) {
          generateWrite(generated, template.slice(index));
          break;
        }

        generateWrite(generated, template.slice(index, nextOpenASP));
        generateRedirect(generated, template.slice(nextOpenASP + 3, closeASP));
        index = closeASP + 2;
      }
      else if (ch === '-') {
        var closeCommentMatch = template.charAt(nextOpenASP + 3) === '-' ? '--%'+'>' : '-%'+ '>';
        var closeComment = template.indexOf(closeCommentMatch, nextOpenASP);
        if (closeComment < 0) {
          generateWrite(generated, template.slice(index));
          break;
        }

        generateWrite(generated, template.slice(index, nextOpenASP));
        index = closeComment + closeCommentMatch.length;
      }
      else {
        var closeASP = template.indexOf('%'+'>', nextOpenASP);
        if (closeASP < 0) {
          generateWrite(generated, template.slice(index));
          break;
        }

        generateWrite(generated, template.slice(index, nextOpenASP));
        generateStatement(generated, template.slice(nextOpenASP + 2, closeASP));
        index = closeASP + 2;
      }

    }

    for (var i = 0; i < scopes.length; i++) {
      generated.push('}');
    }

    generated.push('return output;');

    var fnText = generated.join('\n');
    return fnText;

  }


  function generateWrite(generated: string[], chunk: string) {
    if (chunk)
      generated.push('output.push(\'' + stringLiteral(chunk) + '\');');
  }

  function generateRedirect(generated: string[], redirect: string) {
    var redirectSafe = stringLiteral(redirect);
    generated.push(
      'output.push('+
      '(function() { '+
      'function redirect(){ return ' + redirect + '; } '+
      'redirect._name = \''+redirectSafe+'\'; '+
      'return redirect; '+
      '})());');
  }

  function generateStatement(generated: string[], statement: string) {
    generated.push(statement);
  }

  function stringLiteral(text: string) {
    return text.
      replace(/\\/g, '\\\\').
      replace(/\n/g, '\\n').
      replace(/\r/g, '\\r').
      replace(/\t/g, '\\t').
      replace(/\'/g, '\\\'').
      replace(/\"/g, '\\"');
  }

}