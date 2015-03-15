module portabled.build.functions {

  export function embedFile(...inputs: string[]) {
    var inputsCore: string[] = [];
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i] && typeof inputs[i] !== 'string' && typeof inputs[i].length === 'number') 
        inputsCore = inputsCore.concat(inputs[i]); 
      else 
        inputsCore.push(inputs[i]);
    }
    return embedFileCore(inputsCore);
  }


  function embedFileCore(inputs: string[]) {
    var outputs: string[] = [];
    for (var i = 0; i < inputs.length; i++) {
      var text = processTemplate.mainDrive.read(files.normalizePath(inputs[i]));
      if (text || typeof text === 'string')
        outputs.push(text);
      else
        outputs.push(inputs[i]);
    }
    return outputs.join('\n');
  }

}