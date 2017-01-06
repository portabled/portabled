function functionArgs(fn: Function): string {
  var match = /^[^\(]*\(\s*([^\)]*)\s*\)/.exec(fn+'');
  return match?match[1]:null;
}
