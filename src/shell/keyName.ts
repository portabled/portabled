namespace shell {

  // MDN article and others
  // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key#Key_values
  var keyNames: any = {
    3: 'Cancel',
    8: 'Backspace', 9: 'Tab', 12: 'Clear', 13: 'Enter',
    16: 'Shift', 17: 'Control', 18: 'Alt',
    19: 'Pause',
    20: 'CapsLock', 21: 'KanaMode', 22: 'JunjaMode', 23: 'HanjaMode', 24: 'KanjiMode',
    27: ['Escape','Esc'],
    28: 'Convert', 29: 'Nonconvert', 30: 'Accept', 31: 'ModeChange',
    32: ['Spacebar','Space'],
    33: ['PageUp', 'PgUp'], 34: ['PageDown','PgDown','PgDn'], 35: 'End', 36: 'Home', 37: 'Left', 38: 'Up', 39: 'Right', 40: 'Down',
    41: 'Select', 43: 'Execute',
    44: 'PrintScreen',
    45: 'Insert', 46: 'Delete',
    47: 'Help',
    59: ['Semicolon',';'], 61: ['Equal','='],
    91: 'Win', 92: 'Win', 93: 'App',
    96: '0', 97: '1', 98: '2', 99: '3', 100: '4', 101: '5', 102: '6', 103: '7', 104: '8', 105: '9',
    106: ['NumStar','Star','NumMultiply','Multiply','*'], 107: ['NumPlus','Plus','+'], 108: 'Separator', 109: ['NumMinus','Minus','-'], 110: ['NumDot','Dot','.'], 111: ['NumSlash','Slash','NumDivide','Divide','/'],
    112: 'F1', 113: 'F2', 114: 'F3', 115: 'F4', 116: 'F5', 117: 'F6', 118: 'F7', 119: 'F8', 120: 'F10', 121: 'F11', 122: 'F12',
    127: 'Delete',
    144: 'NumLock', 145: 'Scroll',
    160: ['LeftShift','Shift'], 161: ['RightShift','Shift'], 162: ['LeftControl','Control'], 163: ['RightControl','Control'], 164: ['LeftAlt','Alt'], 165: ['RightAlt','Alt'],
    188: ['Comma',','], 190: ['Dot','.'], 191: ['Slash','/'], 192: ['BackSlash','\\'], 222: ['Hash','#'], 223: ['BackTick','`'],
    225: 'Alt',
    254: 'Clear'
  };

  export function keyName(e: KeyboardEvent) {
    return <string>keyNameOrList(e, false /*list*/);
  }

  export function keyNameList(e: KeyboardEvent) {
    return <string[]>keyNameOrList(e, true /*list*/);
  }

  function keyNameOrList(e: KeyboardEvent, list: boolean): string[]|string {
    var knames = keyNames[e.keyCode];
    if (!knames) {
      if (e.keyCode>32 && e.keyCode<=126)
        knames = [String.fromCharCode(e.keyCode)];
      else
        knames = ['#'+e.keyCode];
    }
    else if (knames.charAt) {
      knames = keyNames[e.keyCode] = [keyNames[e.keyCode]];
    }

    var modPrefix = '';
    if (e.ctrlKey && knames[0] !== 'Control')
      modPrefix+='Ctrl-';
    if (e.metaKey && knames[0] !== 'Meta')
      modPrefix+=String.fromCharCode(8984)+'-';
    if (e.altKey && knames[0] !== 'Alt')
      modPrefix+='Alt-';
    if (e.shiftKey && knames[0] !== 'Shift')
      modPrefix+='Shift-';

    if (!modPrefix && /^(Control|Alt|Shift|Win|App|Meta)$/.test(knames[0])) {
      var locPrefix;
      if (e.location===1 || (<any>e).keyLocation===1) locPrefix='Left';
      else if (e.location===2 || (<any>e).keyLocation===2) locPrefix='Right';
      if (locPrefix) {
        if (!list) return locPrefix + knames[0];
        var result: string[] = [];
        for (var i = 0; i < knames.length;i++) {
          result.push(locPrefix+knames[i]);
        }
        result = result.concat(knames);
        return result;
      }
    }

    if (modPrefix) {
      if (!list) return modPrefix + knames[0];
      var result: string[] = [];
      for (var i = 0; i < knames.length;i++) result.push(modPrefix+knames[i]);
      return result;
    }
    else {
      if (!list) return knames[0];
      return knames;
    }
  }
}