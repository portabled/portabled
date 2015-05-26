module persistence.encodings {

  export function CR(text: string): string {
    return text.
      replace(/\r\n|\n/g, '\r').
      replace(/\-\-\*(\**)\>/g, '--$1>');
  }

}