module persistence.encodings {

  export function LF(text: string): string {
    return text.
      replace(/\r\n|\r/g, '\n');
  }

}