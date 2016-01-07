module shell.layout {

  export class MetricsCollector {

    metrics: CommanderShell.Metrics = {
      hostWidth: 0,
      hostHeight: 0,
      emWidth: 0,
      emHeight: 0
    };

    private _metricElem: HTMLDivElement;

    constructor(window: Window) {
      this.metrics.hostWidth = window.document.body.offsetWidth;
      this.metrics.hostHeight = window.document.body.offsetHeight;

      this._metricElem = window.document.createElement('div');

      this._metricElem.style.position = 'absolute';
      this._metricElem.style.opacity = '0';
      this._metricElem.style.left = '-200px';
      this._metricElem.style.top = '-200px';
      this._metricElem.style.width = 'auto';
      this._metricElem.style.height = 'auto';

      this._metricElem.innerHTML =
      'MMMMMMMM<br>' +
      'MMMMMMMM<br>' +
      'MMMMMMMM<br>' +
      'MMMMMMMM<br>' +
      'MMMMMMMM<br>' +
      'MMMMMMMM<br>' +
      'MMMMMMMM<br>' +
      'MMMMMMMM';

      window.document.body.appendChild(this._metricElem);
    }

    resize(winMetrics: { windowWidth: number; windowHeight: number; }) {
      this.metrics.hostWidth = winMetrics.windowWidth;
      this.metrics.hostHeight = winMetrics.windowHeight;
    }

    measure() {
      this.metrics.emWidth = this._metricElem.offsetWidth / 8;
      this.metrics.emHeight = this._metricElem.offsetHeight / 8;
    }
  }

}