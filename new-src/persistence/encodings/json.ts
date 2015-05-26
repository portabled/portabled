module persistence.encodings {

  export function json(text: string): any {
    var result = typeof JSON ==='undefined' ? eval(text) : JSON.parse(text);

    if (result && typeof result !== 'string' && result.type) {
      var ctor: any = window[result.type];
      result = new ctor(result);
    }

    return result;
  }

}