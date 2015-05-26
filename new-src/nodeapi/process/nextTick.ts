function noprocess_nextTick(callback: Function): void {

  function fire() {
    if (fired) return;
    fired = true;
    callback();
  }

  var fired = false;
  setTimeout(fire, 0);
  if (typeof requestAnimationFrame!=='undefined') {
    requestAnimationFrame(fire);
  }
  else if (typeof msRequestAnimationFrame !== 'undefined') {
    msRequestAnimationFrame(fire);
  }

}