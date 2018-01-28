namespace encodings {

  export function CRLF(text: string): string {
    return text.
      replace(/(\r\n)|\r|\n/g, '\r\n');
  }

}