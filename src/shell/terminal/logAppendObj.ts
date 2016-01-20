module shell.terminal {

  export function logAppendObj(obj: any, output: HTMLDivElement, level: number) {

    switch (typeof obj) {
      case 'number':
      case 'boolean':
        elem('span', { text: obj, color: 'green' }, output);
        break;

      case 'undefined':
        elem('span', { text: 'undefined', color: 'green', opacity: 0.5 }, output);
        break;

      case 'function':
        var funContainer = elem('span', output);
        var funFunction = elem('span', { text: 'function ', color: 'silver', opacity: 0.5 }, funContainer);
        var funName = elem('span', { text: obj.name, color: 'cornflowerblue', fontWeight: 'bold' }, funContainer);
        elem('span', { text: '() { ... }', opacity: 0.5, title: obj }, funContainer);
        break;

      case 'string':
        var strContainer = elem('span', output);
        elem('span', { text: '"', color: 'tomato' }, strContainer);
        elem('span', { text: obj, color: 'tomato', opacity: 0.5 }, strContainer);
        elem('span', { text: '"', color: 'tomato' }, strContainer);
        break;

      default:
        if (obj === null) {
          elem('span', { text: 'null', color: 'green', opacity: 0.5 }, output);
          break;
        }

        if (typeof obj.getFullYear === 'function' && typeof obj.getTime === 'function' && typeof obj.constructor.parse === 'function') {
          elem('span', { text: 'Date(', color: 'green', opacity: 0.5 }, output);
          elem('span', { text: obj, color: 'green' }, output);
          elem('span', { text: ')', color: 'green', opacity: 0.5 }, output);
          break;
        }

        if (typeof obj.tagName === 'string' && 'innerHTML' in obj && obj.children && typeof obj.children.length==='number'
          	&& !obj.parentElement && !obj.parentNode
            && obj.style && typeof obj.style.display === 'string' && obj.style.display !== 'none') {
          elem(<any>obj, <any>output);
          break;
        }


        if (obj.constructor && obj.constructor.name !== 'Object' && obj.constructor.name !== 'Array') {
          elem('span', { text: obj.constructor.name, color: 'cornflowerblue' }, output);
          if (obj.constructor.prototype && obj.constructor.prototype.constructor
            && obj.constructor.prototype.constructor.name
            && obj.constructor.prototype.constructor.name !== 'Object' && obj.constructor.prototype.constructor.name !== 'Array'
            && obj.constructor.prototype.constructor.name !== obj.constructor.name)
            elem('span', { text: ':' + obj.constructor.prototype.constructor.name, color: 'cornflowerblue', opacity: 0.5 }, output);
          elem('span', output);
        }

        if (obj.createElement + '' === document.createElement + '' && obj.getElementById + '' === document.getElementById + '' && 'title' in obj) {
          elem('span', { text: '#document ' + obj.title, color: 'green' }, output);
        }
        else if (obj.setInterval + '' === window.setInterval + '' && obj.setTimeout + '' === window.setTimeout + '' && 'location' in obj) {
          elem('span', { text: '#window ' + obj.location, color: 'green' }, output);
        }
        else if (typeof obj.tagName === 'string' && obj.getElementsByTagName + '' === document.body.getElementsByTagName + '') {
          elem('span', { text: '<' + obj.tagName + '>', color: 'green' }, output);
        }
        else if (typeof obj.length === 'number' && obj.length >= 0) {
          elem('span', { text: '[', color: 'white' }, output);
          if (level > 1) {
            elem('span', { text: '...', color: 'silver' }, output);
            // TODO: handle click
          }
          else {
            for (var i = 0; i < obj.length; i++) {
              if (i > 0) elem('span', { text: ', ', color: 'gray' }, output);
              if (typeof obj[i] !== 'undefined')
                logAppendObj(obj[i], output, level + 1);
            }
          }
          elem('span', { text: ']', color: 'white' }, output);
        }
        else {
          try {
          	var toStr = obj+'';
          }
          catch (toStrError) {
            var toStrFailed = true;
          }

          if (!toStrFailed && toStr !== '[Object]') {
            elem('span', { text: '{', color: 'cornflowerblue' }, output);
            if (level > 1) {
              elem('span', { text: '...', color: 'cornflowerblue', opacity: 0.5 }, output);
              // TODO: handle click
            }
            else {
              var first = true;
              var hadMessage = false;
              var hadStack = false;

              var indentStr = Array(level + 2).join('  ');
              var insertNewLineIndent = () => {
                elem('br', output);
                elem('span', { text: indentStr }, output);
              };

              var insertCommaIndent = () => {
                elem('span', { text: ',', color: 'cornflowerblue', opacity: 0.3 }, output);
                insertNewLineIndent();
              };

              for (var k in obj) {
                if (k !== 'message' && k !== 'stack'
                    && obj.hasOwnProperty && !obj.hasOwnProperty(k)) continue;
                if (first) {
                  if (level) {
                    elem('br', output);
                    var indentStr = Array(level + 2).join('  ');
                    elem('span', { text: indentStr }, output);
                  } else {
                    elem('span', { text: ' ' }, output);
                  }
                  first = false;
                }
                else {
                  insertCommaIndent();
                }

                elem('span', { text: k, color: 'cornflowerblue', fontWeight: 'bold' }, output);
                elem('span', { text: ': ', color: 'cornflowerblue', opacity: 0.5 }, output);
                logAppendObj(obj[k], output, level + 1);
                if (k === 'message') hadMessage = true;
                if (k === 'stack') hadStack = true;
              }
              if (typeof obj.message === 'string' && !hadMessage) {
                if (!first) insertCommaIndent();
                first = false;
                elem('span', { text: 'message', color: 'tomato', fontWeight: 'bold' }, output);
                elem('span', { text: ': ', color: 'tomato', opacity: 0.5 }, output);
                elem('span', { text: obj.message, color: 'tomato' }, output);
              }
              if (typeof obj.stack === 'string' && !hadStack) {
                if (!first) insertCommaIndent();
                first = false;
                elem('span', { text: 'stack', color: 'tomato', fontWeight: 'bold' }, output);
                elem('span', { text: ':', color: 'tomato', opacity: 0.5 }, output);
                var insetBlock = elem('div', { paddingLeft: '2em' }, output);
                elem('span', { text: obj.stack, color: 'goldenrod' }, insetBlock);
              }
            }
            if (!first) elem('span', ' ', output);

            elem('span', { text: '}', color: 'cornflowerblue' }, output);
          }
          else {
            elem('span', { text: toStrFailed ? 'Object' : toStr, color: 'cornflowerblue' }, output);
        	}
        }
        break;
    }
  }

}