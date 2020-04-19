namespace encodings {

  export function eval(text: string): any {
    return (
      0 as any,
      (typeof window !== 'undefined' && window) ? window['eval'] :
        (typeof global !== 'undefined' && global) ? global['eval'] :
          (function (this: any) { return this; })()['eval']
      )(text);
  }

}