module shell {

  function start(complete: () => void) {
    complete();
  }


  (<any>shell).start = start;

}