module portabled.build {
  
  export function processTemplate(
    template: string, scopes: any[],
    log: (logText: string) => void,
    callback: (error: Error, result?: string) => void): void {
    // <%= expr %>
    // <% statement %>
    // <%-- comment --%>

    log('Generating build script...');
    setTimeout(() => {
    	var fnText = generateBuildScript(template, scopes);

      log('Preprocessing build script...');
      setTimeout(() => {
        var fn = Function('scopes', fnText);

        log('Executing build script...');

        var output: any[] = fn(scopes);
        var outputIndex = 0;

        processNextOutputChunk();

        function processNextOutputChunk() {
          var startTime = dateNow();

          // all heavy chunks will bail out and queue the next one on setTimeout,
          // simple literal insertions keep going for a slice of time
          while (true) {
            if (outputIndex>=output.length) {
              var result = output.join('');
              callback(null, result);
              return;
            }

            var outputChunk = output[outputIndex];
            if (typeof outputChunk==='function') {
              log('Processing ' + outputChunk + '...');
              setTimeout(() => {
                try {
                  var chunkResult = outputChunk();
                  var chunkResultText = String(chunkResult);
                  output[outputIndex] = chunkResultText;
                }
                catch (error) {
                  callback(error);
                  return;
                }

                log('...OK [' + chunkResultText.length + ']');
                outputIndex++;
                processNextOutputChunk();
                //setTimeout(processNextOutputChunk, 1);
              }, 1);
              break;
            }
            else {
              var literal = String(outputChunk);
              output[outputIndex] = literal;
              var literalLines = (literal.length > 100 ? literal.slice(0, 50) + '\n...\n' + literal.slice(literal.length - 5) : literal).split('\n');
              while (literalLines.length && !literalLines[0]) literalLines.shift();
              while (literalLines.length && !literalLines[literalLines.length - 1]) literalLines.pop();
              log(literalLines.length <= 2 ? literalLines.join('\n') : literalLines[0] + '\n...\n' + literalLines[literalLines.length - 1]);
              outputIndex++;

              if (dateNow() - startTime > 300) {
              	setTimeout(processNextOutputChunk, 1);
                break;
              }
              // keep going if haven't been processing for long yet

            }
          }
        }
        
      }, 1);

    }, 1);

  }

  export module processTemplate {

    export var mainDrive: persistence.Drive;

  }
  
  function generateBuildScript(template: string, scopes: any[]): string {
    var generated: string[] = [];
    for (var i = 0; i < scopes.length; i++) {
      generated.push('with(scopes[' + i + ']) {');
    }
    
    generated.push('var output =[];');

    var index = 0;
    while (index < template.length) {
      
      var nextOpenASP = template.indexOf('<%', index);
      if (nextOpenASP < 0) {
        generateWrite(generated, template.slice(index));
        break;
      }

      var ch = template.charAt(nextOpenASP + 2);
      if (ch === '=') {
        var closeASP = template.indexOf('%>', nextOpenASP);
        if (closeASP < 0) {
          generateWrite(generated, template.slice(index));
          break;
        }

        generateWrite(generated, template.slice(index, nextOpenASP));
        generateRedirect(generated, template.slice(nextOpenASP + 3, closeASP));
        index = closeASP + 2;
      }
      else if (ch === '-') {
        var closeCommentMatch = template.charAt(nextOpenASP + 3) === '-' ? '--%>' : '-%>';
        var closeComment = template.indexOf(closeCommentMatch, nextOpenASP);
        if (closeComment < 0) {
          generateWrite(generated, template.slice(index));
          break;
        }

        generateWrite(generated, template.slice(index, nextOpenASP));
        index = closeComment + closeCommentMatch.length;
      }
      else {
        var closeASP = template.indexOf('%>', nextOpenASP);
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
    generated.push('output.push(' + redirect + ');');
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