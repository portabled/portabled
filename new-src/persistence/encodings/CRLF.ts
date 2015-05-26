module persistence.encodings {

  export function CRLF(text: string): string {
    return text.
      replace(/\r|\n/g, '\r\n').
      replace(/\-\-\*(\**)\>/g, '--$1>');
  }

}