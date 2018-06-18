namespace layout {

  export class MetricsCollector {

    metrics: CommanderShell.Metrics = {
      hostWidth: 0,
      hostHeight: 0,
      emWidth: 0,
      emHeight: 0,
      scrollbarWidth: 0,
      scrollbarHeight: 0
    };

    private _metricElem: HTMLDivElement;
  	private _scrollWElem: HTMLDivElement;
  	private _scrollWChildElem: HTMLDivElement;
  	private _scrollHElem: HTMLDivElement;
  	private _scrollHChildElem: HTMLDivElement;

    constructor(window: Window) {
      this.metrics.hostWidth = window.document.body.offsetWidth;
      this.metrics.hostHeight = window.document.body.offsetHeight;

      this._metricElem = window.document.createElement('div');

      this._metricElem.style.position = 'absolute';
      this._metricElem.style.opacity = '0';
      this._metricElem.style.left = '-400px';
      this._metricElem.style.top = '-400px';
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

      this._scrollWElem = window.document.createElement('div');
      this._scrollWElem.style.position = 'absolute';
      this._scrollWElem.style.opacity = '0px';
      this._scrollWElem.style.left = '-400px';
      this._scrollWElem.style.top = '-400px';
      this._scrollWElem.style.width = '100px';
      this._scrollWElem.style.height = '100px';
      this._scrollWElem.style.overflow = 'auto';
      this._scrollWChildElem = window.document.createElement('div');
      this._scrollWChildElem.style.width = '100%'; // this will give us inner width, without the scrollbar
      this._scrollWChildElem.style.height = '200px';
      if ('textContent' in this._scrollWChildElem) this._scrollWChildElem.textContent = '.';
      else (this._scrollWChildElem as HTMLElement).innerText = '.';
      this._scrollWElem.appendChild(this._scrollWChildElem);
      window.document.body.appendChild(this._scrollWElem);

      this._scrollHElem = window.document.createElement('div');
      this._scrollHElem.style.position = 'absolute';
      this._scrollHElem.style.opacity = '0px';
      this._scrollHElem.style.left = '-400px';
      this._scrollHElem.style.top = '-400px';
      this._scrollHElem.style.width = '100px';
      this._scrollHElem.style.height = '100px';
      this._scrollHElem.style.overflow = 'auto';
      this._scrollHChildElem = window.document.createElement('div');
      this._scrollHChildElem.style.height = '100%'; // this will give us inner width, without the scrollbar
      this._scrollHChildElem.style.width = '200px';
      if ('textContent' in this._scrollHChildElem) this._scrollHChildElem.textContent = '.';
      else (this._scrollHChildElem as HTMLElement).innerText = '.';
      this._scrollHElem.appendChild(this._scrollHChildElem);
      window.document.body.appendChild(this._scrollHElem);

    }

    resize(winMetrics: { windowWidth: number; windowHeight: number; }) {
      this.metrics.hostWidth = winMetrics.windowWidth;
      this.metrics.hostHeight = winMetrics.windowHeight;
    }

    measure() {
      this.metrics.emWidth = this._metricElem.offsetWidth / 8;
      this.metrics.emHeight = this._metricElem.offsetHeight / 8;
      this.metrics.scrollbarWidth = 100 - this._scrollWChildElem.offsetWidth;
      this.metrics.scrollbarHeight = 100 - this._scrollHChildElem.offsetHeight;
    }
  }

}