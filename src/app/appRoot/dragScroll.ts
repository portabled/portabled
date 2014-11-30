module portabled.app.appRoot {
  
  export function dragScrollMouseDown(e: MouseEvent, scroller: HTMLElement) {
    var start = e.clientX;
    var startScroll = scroller.scrollLeft;
    var move = (e: MouseEvent) => {
      var offset = e.clientX - start;
      scroller.scrollLeft = startScroll - offset;
    };
    var up = (e: MouseEvent) => {
      removeEventListener(window, 'mousemove', move);
      removeEventListener(window, 'mouseup', up);
      if (scroller.releaseCapture) {
        scroller.releaseCapture();
        removeEventListener(scroller, 'mousemove', move);
        removeEventListener(scroller, 'mouseup', up);
      }
    };
    if (scroller.setCapture) {
      scroller.setCapture(true);
      addEventListener(scroller, 'mousemove', move);
      addEventListener(scroller, 'mouseup', up);
    }
    addEventListener(window, 'mousemove', move);
    addEventListener(window, 'mouseup', up);
  }
  
}