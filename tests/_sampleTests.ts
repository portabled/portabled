/**
 * All tests are stashed away in teapo.tests module.
 * Teapo is an application, not a library, so all the tests are tests of the application pieces and parts.
 */
module teapo.tests {

  export function sampleTest() {
    return; // ok!
  }

  export function sampleAsyncTest(callback: (error: Error) => void) {
    callback(null);
  }

  export module sampleModule { 

    export function sampleTest() { 
    }
    
  }

  /* uncomment to see how failing tests presented in UI
  export function sampleFailingTest() { 
    throw new Error('Failing on purpose, synchronously.');
  }

  export function sampleAsyncFailingTest(callback: (error: Error) => void) { 
    callback(new Error('Failing on purpose, asynchronously.'));
  }
  */

}