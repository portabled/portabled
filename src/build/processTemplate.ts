module teapo.build {
  
  export function processTemplate(template: string, scopes: any[]): string {
    // <%= expr %>
    // <% statement %>
    // <%-- comment --%>

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

    generated.push('return output.join(\'\');');

    var fnText = generated.join('\n');
    
    var fn = Function('scopes', fnText);
    
    return fn(scopes);
  }

  export module processTemplate {

    export var mainDrive: persistence.Drive;

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
      replace(/\n/g, '\\n').
      replace(/\r/g, '\\r').
      replace(/\t/g, '\\t').
      replace(/\'/g, '\\\'').
      replace(/\"/g, '\\"');
  }
  
}