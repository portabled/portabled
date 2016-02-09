interface KeyboardEvent {
  shellKeyNames: string[];
  shellPressed: any; // { [key: string]: boolean; };
}

namespace shell {

  var simplifiedKeyNames = {};

  interface KeyNameInfo {
    map: { [key: string]: boolean; } & any;
    names: string[];
  }

  const enum Modifiers {
    Ctrl = 1,
    Alt = 2,
    Shift = 4,
    Meta = 8
  };

  interface KeyInfo extends KeyNameInfo {
    modified: KeyNameInfo[];
  }

  export function enrichKeyEvent(e: KeyboardEvent) {
    if (e.shellKeyNames) return;

    var info = getKeyNameInfo(e);
    e.shellKeyNames = info.names;
    e.shellPressed = info.map;
  }

  export function dispatchKeyEvent(e: KeyboardEvent, handlers: any) {
    enrichKeyEvent(e);

    var knames = e.shellKeyNames;

    for (var i = 0; i < knames.length; i++) {
      var sim = knames[i];
      if (/\-/.test(sim)) sim = simplifiedKeyNames[sim] || (simplifiedKeyNames[sim] = sim.replace(/\-/g, ''));
      if (typeof handlers[sim]==='function') {
        var proc = handlers[sim](e);
        if (proc) return proc;
      }
    }

  }

  var keyNames: KeyInfo[] = (function(){
    var _keyNames: any = {
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

    var keyNames: KeyInfo[] = [];

    for (var codeStr in _keyNames) if (_keyNames.hasOwnProperty(codeStr)) {
      keyNames[codeStr] = makeKeyInfo(_keyNames[codeStr]);
    }

    return keyNames;
  })();

  function enrichWithModifier(info: KeyInfo, mod: Modifiers) {
    var prefix = '';
    if (mod & Modifiers.Ctrl) prefix = 'Ctrl';
    if (mod & Modifiers.Alt) prefix = prefix ? (prefix+'-Alt') : 'Alt';
    if (mod & Modifiers.Shift) prefix = prefix ? (prefix+'-Shift') : 'Shift';
    if (mod & Modifiers.Meta) prefix = prefix ? (prefix+'-\u2318') : '\u2318';
   	var modknames = [];
    var modmap: any = {};
    for (var i = 0; i < info.names.length; i++) {
      var modnm = prefix + info.names[i];
      modknames[i] = modnm;
      modmap[modnm] = true;
    }

    return info.modified[mod] = { names: modknames, map: modmap };
  }

  function makeKeyInfo(defn: string | string[]): KeyInfo {
    var names: string[] = <string[]>defn;
    if (typeof names ==='string') names = [<any>names];

    var map: any = {};
    for (var i = 0; i < names.length; i++) {
      map[names[i]] = true;
    }

    return {
      map: map,
      names: names,
      modified: []
    };
  }

  function getKeyNameInfo(e: KeyboardEvent): KeyNameInfo {

    var baseInfo = keyNames[e.keyCode];
    if (!baseInfo) {
      var defn = e.keyCode>32 && e.keyCode<=126 ? String.fromCharCode(e.keyCode) : '#'+e.keyCode;
      keyNames[e.keyCode] = baseInfo = makeKeyInfo(defn);
    }

    var mod: Modifiers = 0;
    if (e.ctrlKey && !baseInfo.map.Control)
      mod=Modifiers.Ctrl;
    if (e.metaKey && !baseInfo.map.Meta)
      mod|=Modifiers.Meta;
    if (e.altKey && !baseInfo.map.Alt)
      mod|=Modifiers.Alt;
    if (e.shiftKey && !baseInfo.map.Shift)
      mod|=Modifiers.Shift;

    if (!mod) return baseInfo;

    var modInfo = baseInfo[mod];
    if (modInfo) return modInfo;

    return enrichWithModifier(baseInfo, mod);
  }
}