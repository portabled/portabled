module teapo.tests {

  export class TestPage {

    all: TestCase[] = [];

    notStarted = ko.observableArray<TestCase>([]);
    running = ko.observableArray<TestCase>([]);
    succeeded = ko.observableArray<TestCase>([]);
    failed = ko.observableArray<TestCase>([]);

    workQuantum = 50;

    private _continueStartingClosure = () => this._continueStarting();
    private _updateTimesInterval: number = null;

    constructor(
      namespace: any = teapo.tests,
      private _queueWorkItem: (action: () => void) => void = action => setTimeout(action, 10)) {

      this._loadTests(namespace);

    }

    start() {
      if (this._updateTimesInterval) {
        clearInterval(this._updateTimesInterval);
        this._updateTimesInterval = null;
      }
      
      if (this.all.length) {
        this._updateTimesInterval = setInterval(() => this._updateTimes(), 100);
      }

      this._continueStarting();
    }

    private _updateTimes() {
      if (this.running().length + this.notStarted().length === 0) {
        clearInterval(this._updateTimesInterval);
        this._updateTimesInterval = 0;
        return;
      }

      var now = dateNow();
      forEach(this.running(), t => t.updateTimes(now));
    }

    private _continueStarting() {
      var now = dateNow();
      forEach(this.running(), t => {
        t.updateTimes(now);
      });
      
      var nextRest = dateNow() + this.workQuantum;
      while (true) {

        if (!this.notStarted().length)
          return;

        this._startOne();

        if (!this.notStarted().length)
          return;
        
        if (dateNow() >= nextRest) {
          this._queueWorkItem(this._continueStartingClosure);
          return;
        }
      }
    }

    private _startOne() {
      var nextTest = this.notStarted.shift();
      this.running.push(nextTest);

      nextTest.start(() => {

        this.running.remove(nextTest);

        var newState = nextTest.state();

        var targetCollection =
          newState === TestCase.State.Succeeded ? this.succeeded :
          newState === TestCase.State.Failed ? this.failed :
          null;

        if (targetCollection) {
          var targetCollectionArray = targetCollection();

          // iterate backwards, as the tests are likely to complete in the order they started
          for (var i = targetCollectionArray.length - 1; i >= 0; i--) {
            var t = targetCollectionArray[i];
            if (nextTest.name > t.name) {
              targetCollection.splice(i + 1, 0, nextTest);
              return;
            }
          }

          targetCollection.unshift(nextTest);
        }
      });
    }

    private _loadTests(namespace: any) {

      var byName: { [name: string]: TestCase; } = {};
      var names: string[] = [];

      TestPage.forEachTest(namespace, (name, _this_, test) => {
        var testCase = new TestCase(name, _this_, test);
        byName[name] = testCase;
        names.push(name);
      });

      names.sort();
      forEach(names, name => {
        var testCase = byName[name];
        this.all.push(testCase);
      });

      this.notStarted(this.all);

    }

    static forEachTest(namespace: any, callback: (name: string, _this_: any, test: () => void) => void) {

      for (var k in namespace) {
        if (!k || k.charAt(0) === '_' || Object.prototype[k]) continue;

        var t = namespace[k];
        if (typeof t === 'function') {
          var isClass = false;
          for (var k in t.prototype) {
            if (!k || Object.prototype[k]) continue;
            
            isClass = true;
            break;
          }

          if (isClass) {
            if (!t.length)
              TestPage.forEachTest(
                new t(),
                (name, _this_, test) => callback(k + '.' + name, _this_, test));
          }
          else {
            callback(k, namespace, t);
          }
        }
        else if (typeof t === 'object') {
          TestPage.forEachTest(
            t,
            (name, _this_, test) => callback(k+'.'+name, _this_, test));
        }
      }

    }
  }

}