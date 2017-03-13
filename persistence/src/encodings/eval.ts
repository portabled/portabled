namespace encodings {

  export function eval(text: string): any {
    return (0 as any, window['eval'])(text);
  }

}