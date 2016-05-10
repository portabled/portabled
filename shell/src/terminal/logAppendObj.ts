namespace terminal {

  var ansiColorStyles = {

    '30': { color: 'black' },
    '31': { color: 'firebrick' },
    '32': { color: 'forestgreen' },
    '33': { color: 'olive' },
    '34': { color: 'navy' },
    '35': { color: 'MediumVioletRed' },
    '36': { color: 'teal' },
    '37': { color: 'silver' },
    '90': { color: 'gray' },
    '91': { color: 'tomato' },
    '92': { color: 'lime' },
    '93': { color: 'gold' },
    '94': { color: 'cornflowerblue' },
    '95': { color: 'HotPink' },
    '96': { color: 'aqua' },
    '97': { color: 'white' },

    '40': { background: 'black' },
    '41': { background: 'firebrick' },
    '42': { background: 'forestgreen' },
    '43': { background: 'olive' },
    '44': { background: 'navy' },
    '45': { background: 'MediumVioletRed' },
    '46': { background: 'teal' },
    '47': { background: 'silver' },
    '100': { background: 'gray' },
    '101': { background: 'tomato' },
    '102': { background: 'lime' },
    '103': { background: 'gold' },
    '104': { background: 'cornflowerblue' },
    '105': { background: 'HotPink' },
    '106': { background: 'aqua' },
    '107': { background: 'white' }
  };

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
        if (obj.name)
        	elem('span', { text: obj.name, color: 'cornflowerblue', fontWeight: 'bold' }, funContainer);

        elem('span', { text: '() { ... }', opacity: 0.5, title: obj }, funContainer);
        break;

      case 'string':
        if (level===0) {
          var colorRegex =/\u001b\[((\d+)(\;\d+)?)m/g;
          var next = colorRegex.exec(obj);
          if (next) {
            var colorStr = elem('span', { color: 'silver' }, output);
            var lastColorDef: any = null;
            var strIndex =0;
            while (strIndex < obj.length) {
              var nextIndex = next ? next.index : obj.length;
              var nextChunk: any = { text: obj.slice(strIndex, nextIndex) };

              if (lastColorDef && lastColorDef.color) nextChunk.color = lastColorDef.color;
              if (lastColorDef && lastColorDef.background) nextChunk.background = lastColorDef.background;

              elem('span', nextChunk, colorStr);

              if (!next) break;

              if (/\;/.test(next[1])) {
                var nums = next[1].split(';');
                var def1 = ansiColorStyles[nums[0]];
                var def2 = ansiColorStyles[nums[1]];
                if (!def1) lastColorDef = def2;
                else if (!def2) lastColorDef = def1;
                else {
                  lastColorDef = {
                    color: def1.color || def2.color,
                    background: def1.background || def2.background
                  };
                }
              }
              else {
              	lastColorDef = ansiColorStyles[next[1]];
              }
              strIndex = next.index + next[0].length;
              colorRegex.lastIndex = strIndex;

              var next = colorRegex.exec(obj);
            }
          }
          else {
          	elem('span', { text: obj, color: 'silver' }, output);
          }
        }
        else {
          var strContainer = elem('span', output);
          elem('span', { text: '"', color: 'silver' }, strContainer);
          elem('span', { text: obj, color: 'white', opacity: 0.5 }, strContainer);
          elem('span', { text: '"', color: 'silver' }, strContainer);
        }
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
          	&& !obj.parentElement && (!obj.parentNode || !/HTML/i.test(obj.tagName||'')) // in legacy browsers parentNode may be documentElement, skip those
            && obj.style && typeof obj.style.display === 'string' && obj.style.display !== 'none') {
          elem(<any>obj, <any>output);
          break;
        }


        if (obj.constructor && obj.constructor.name && obj.constructor.name !== 'Object' && obj.constructor.name !== 'Array') {
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