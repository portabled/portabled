function functionBody(fn: Function | string, replacements: substitute.Replacements): string {
  // first skip until (
  // then skip until )
  // then skip until {
  // then take everything until the last }
  var match =
      /^[^\(]*\([^\)]*\)[^\{]*\{([\s\S]*)\}[^\}]*$/.exec(fn+'');
  // /^[^\(]*\([^\)]*\)[^\{]*\{([ \t]*\n)([\s\S]*)([ \t]*\n[ \t]*)\}[^\}]*$/.exec(fn+'');
  if (!match) return null;

  var bodyText = match[1];
  if (!replacements) return bodyText;
  else return substitute(bodyText, replacements);
}
