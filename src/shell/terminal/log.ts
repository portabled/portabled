module shell.terminal {

  export function log(args: any[], historyContent: HTMLElement) {
    var output = elem('div', historyContent);
    for (var i = 0; i < args.length; i++) {
      if (i > 0)
        elem('span', { text: ' ' }, output);
      if (args[i] === null) {
        elem('span', { text: 'null', color: 'green' }, output);
      }
      else {
        logAppendObj(args[i], <any>output, 0);
      }
    }
  }
}