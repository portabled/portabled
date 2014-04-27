module teapo.tests {

  export class TestCase {

    state = ko.observable(TestCase.State.NotStarted);
    runtime = ko.observable<number>(null);
    failure = ko.observable<Error>(null);
    async: boolean;

    private _started = -1;
    private _async: boolean;

    constructor(
      public name: string,
      private _this_: any,
      private _test: Function) {

      this.async = this._test.length ? true : false;

    }

    start(callback?: () => void) {
      if (this.state() !== TestCase.State.NotStarted)
        throw new Error('Test case already started (' + TestCase.State[this.state()] + ').');

      if (this.async) {
        this._startAsync(callback);
      }
      else {
        this._startSync();
        if (callback) callback();
      }
    }

    updateTimes(now: number) {
      if (this.state() === TestCase.State.Running)
        this.runtime(now - this._started);
    }

    private _startSync() {

      this.state(TestCase.State.Running);
      this.runtime(0);
      this._started = Date.now();

      var failure: Error;
      var failed = false;
      try {
        this._test.apply(this._this_);
      }
      catch (error) {
        failed = true;
        failure = error;
      }

      this.runtime(Date.now() - this._started);

      if (failed) {
        this.failure(failure);
        this.state(TestCase.State.Failed);
      }
      else {
        this.state(TestCase.State.Succeeded);
      }
    }

    private _startAsync(callback?: () => void) {
      this.state(TestCase.State.Running);
      this.runtime(0);
      this._started = Date.now();

                        
      var failure: Error;
      var failedSynchrously = false;
      try {
        this._test.apply(this._this_, [(failure?) => {

          this.runtime(Date.now() - this._started);

          if (failure) {
            this.failure(failure);
            this.state(TestCase.State.Failed);
          }
          else {
            this.state(TestCase.State.Succeeded);
          }

          if (callback)
            callback();
        }]);
      }
      catch (error) {
        failedSynchrously = true;
        failure = error;
      }

      this.runtime(Date.now() - this._started);

      if (failedSynchrously) {
        this.failure(failure);
        this.state(TestCase.State.Failed);

        if (callback)
          callback();
      }
    }
  }

  export module TestCase {

    export enum State {
      NotStarted,
      Running,
      Succeeded,
      Failed
    }

  }

}