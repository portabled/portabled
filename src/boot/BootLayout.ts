module teapo.boot {

  export class BootLayout {

    container: HTMLElement;

    private _titleContainer: HTMLElement;
    private _titleDiv: HTMLElement;
    private _titleProgressBarContainer: HTMLElement;
    private _titleProgressBar: HTMLElement;
    private _titleProgressCaption: HTMLElement;

    constructor(private _dom: Dom) { 
      this.container = this._dom.createElement('div', {
        position: 'fixed',
        zIndex: 1000000,
        left: '0px', top: '0px', right: '0px', bottom: '0px',
        background: 'white', color: 'black'
      });

      this._titleContainer = this._dom.createElement('div', {
        position: 'fixed',
        left: '5%', top: '5%', right: '5%'
      }, this.container);


      this._titleDiv = this._dom.createElement('div', {
        fontSize: '200%',
        text: 'Loading...'
      }, this._titleContainer);

      this._titleProgressBarContainer = this._dom.createElement('div', {
        height: '2px',
        background: 'whitesmoke'
      }, this._titleContainer);

      this._titleProgressBar = this._dom.createElement('div', {
        height: '2px',
        background: 'gold',
      }, this._titleProgressBarContainer);

      this._titleProgressCaption = this._dom.createElement('div', {
        fontSize: '90%',
        text: 'Initializing early boot process...'
      }, this._titleContainer);
    }

    setTitle(title: string) {
      Dom.setText(this._titleDiv, title);
    }

    setSmallStatusText(statusText: string) {
    }

    setSmallProgressText(progressText: string) {
      Dom.setText(this._titleProgressCaption, progressText);
    }

    setProgressColor(color: string) {
      this._titleProgressBar.style.backgroundColor = color;
    }

    setProgressRatio(ratio: number) {
      this._titleProgressBar.style.width = Math.floor(ratio * 1000) / 10 + '%';
    }

  }


}