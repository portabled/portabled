namespace encodings {

  export function eval(text: string): any {
    return (0, window['eval'])(text);
  }

}