var shadeOpacity = 0.5;
var fadeDuration = 300;

class DialogHost {

  private _shade: HTMLElement = null;
  private _popupStack: DialogInstance[] = [];

  private _animateInterval: number = null;
  private _animateOutDialog: DialogInstance = null;
  private _animationLastTime = 0;
  private _animationLastPhase = 0;

  constructor() {
  }

  active(): DialogInfo {
    return this._popupStack[this._popupStack.length-1||0]||null;
  }

  show(dialogBody: HTMLElement): DialogInfo {
    //var handleClick = (e: Event) => {
    //  if (typeof e.preventDefault === 'function') e.preventDefault();
    //  e.cancelBubble = true;
    //};
    //dialogBody.onclick = dialogBody.onmousedown = dialogBody.ontouchstart = <any>handleClick;

    if (this._shade) {
      var lastTopDialog = this._popupStack[this._popupStack.length-1];
      if (lastTopDialog) {
        // move current dialog underneath the shade
        document.body.removeChild(lastTopDialog.dialogBody);
        lastTopDialog.dialogBody.style.opacity = <any>1;
        document.body.insertBefore(lastTopDialog.dialogBody, this._shade);
      }
      else if (this._animateOutDialog) {
        document.body.removeChild(this._animateOutDialog.dialogBody);
        this._animateOutDialog = null;
      }
    }
    else {
      this._addShade();
    }
    var instance = new DialogInstance(cancelCheck => this._dialogInstance_close(cancelCheck), dialogBody);
    this._popupStack.push(instance);
    dialogBody.style.opacity = <any>0;
    document.body.appendChild(dialogBody);
    this._animationLastTime =+new Date();
    if (!this._animateInterval)
      this._animateInterval = setInterval(() => this._processAnimation(), 5);

    this._processAnimation();

    return instance;
  }

  private _processAnimation() {
    var goingIn = !this._animateOutDialog;
    var newTime = +new Date();
    var newPhase =
        this._animationLastPhase +
        (this._animationLastTime ? (+newTime - this._animationLastTime)/(goingIn ? fadeDuration : fadeDuration/2) : 0) * (goingIn?+1:-1);
    if (newPhase >=1 && goingIn) {
      var dlg = this._popupStack[this._popupStack.length-1||0];
      if (dlg) {
        dlg.dialogBody.style.opacity = <any>1;
        this._shade.style.opacity = <any>shadeOpacity;
      }

      clearInterval(this._animateInterval);
      this._animateInterval = null;
      this._animationLastPhase = 1;
      this._animationLastTime = 0;
      return;
    }
    else if (newPhase <= 0 && !goingIn) {
      if (typeof this._animateOutDialog.onclose === 'function') this._animateOutDialog.onclose();
      document.body.removeChild(this._animateOutDialog.dialogBody);
      this._animateOutDialog = null;

      var nextDlg = this._popupStack[this._popupStack.length-1||0];
      if (nextDlg) {
        this._shade.style.opacity = <any>shadeOpacity;
        document.body.removeChild(nextDlg.dialogBody);
        document.body.appendChild(nextDlg.dialogBody);
      }
      else {
        document.body.removeChild(this._shade);
        this._shade = null;
      }

      clearInterval(this._animateInterval);
      this._animateInterval = null;
      this._animationLastPhase = 0;
      this._animationLastTime = 0;
      return;
    }

    if (goingIn) {
      var dlg = this._popupStack[this._popupStack.length-1];
      dlg.dialogBody.style.opacity = <any>newPhase;
      this._shade.style.opacity = <any>(shadeOpacity*newPhase);
    }
    else {
      this._animateOutDialog.dialogBody.style.opacity = <any>newPhase;
      if (!this._popupStack.length) this._shade.style.opacity = <any>(shadeOpacity*newPhase);
    }

  }

  private _addShade() {
    this._shade = document.createElement('div');
    // TODO: shall we rely on CSS here?
    this._shade.style.cssText = 'background: black; opacity: 0; position: absolute; left: 0; top: 0; width: 100%; height: 100%;';
    document.body.appendChild(this._shade);

    var handleCancelRequest;
    var clickCancelRequest = e => {
      if (e.srcElement!==this._shade && e.targetElement!==this._shade) return;
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if ('cancelBubble' in e) e.cancelBubble = true;
      if (!handleCancelRequest) {
        handleCancelRequest = setTimeout(() => {
          handleCancelRequest = 0;
          this._dialogInstance_close(true);
        }, 1);
      }
    };

    on(this._shade, 'mousedown', clickCancelRequest);
    on(this._shade, 'click', clickCancelRequest);
    on(this._shade, 'touchstart', clickCancelRequest);
  }

  private _dialogInstance_close(cancelCheck: boolean) {

    // TODO: handle out-of-order closing
    var dlg = <DialogInstance>this.active();
    if (!dlg) return;
    if (cancelCheck && typeof dlg.oncancelling === 'function' && dlg.oncancelling()) return;

    if (this._animateOutDialog)
      document.body.removeChild(this._animateOutDialog.dialogBody);

    this._animateOutDialog = dlg;
    this._popupStack.pop();

    this._animationLastTime = +new Date();

    if (!this._animateInterval)
      this._animateInterval = setInterval(() => this._processAnimation(), 5);

    this._processAnimation();
  }

}

class DialogInstance implements DialogInfo {

  constructor(
    private _close: (cancelCheck: boolean) => void,
    public dialogBody: HTMLElement) {
    }

  oncancelling: () => boolean = null;
  onclose: (cancelled?: boolean) => void = null;

  close(cancelCheck = true) {
    this._close(cancelCheck);
  }

}

interface DialogInfo {

  dialogBody: HTMLElement;

  close(cancelCheck?: boolean);

  oncancelling: () => boolean;
  onclose: (cancelled?: boolean) => void;

}