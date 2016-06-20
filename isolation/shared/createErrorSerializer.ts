function createErrorSerializer() {

  var dummyError = new Error();
  var knownProps = [
    'message', 'name',
    'stack',
    'fileName', 'lineNumber', 'columnNumber',
    'description', 'number', 'stackTraceLimit'
  ];

  var deserializedCtorCache = {};

  return {
    serialize: serialize_error,
    deserialize: deserialize_error
  };

  function serialize_error(error) {

    if (!error) return error;
    var result = {};

    if (typeof error.constructor==='function') {
      if (error.constructor.name) {
        result['@constructor']=error.constructor.name;
      }
      else {
        var nameMatch = /function ([^\(]*)/.exec(error.constructor+'');
        if (nameMatch && nameMatch[1] && nameMatch[1].length<200) {
          var ctorName = nameMatch[1].replace(/[\s]+/g, ''); // additionally eliminate possible spaces
          result['@constructor']=ctorName;
        }
      }
    }

    for (var i = 0; i < knownProps.length; i++) {
      var p = knownProps[i];
      if (error[p]!==null && typeof error[p]!=='undefined' && typeof error[p]!=='function')
        result[p] = error[p];
    }

    for (var p in error) {
      if (p in result) continue;
      // this skips those weird upper-case constants from Error
      if (p in dummyError && error[p]===dummyError[p] && p.match(/^[A-Z][A-Z0-9_]+$/)) continue;
      if (typeof error[p]==='function') continue;
      result[p] = error[p];
    }

    if (error.prototype) {
      for (var p in error.prototype) {
        if (p in result) continue;
        // this skips those weird upper-case constants from Error
        if (p in dummyError && error[p]===dummyError[p] && p.match(/^[A-Z][A-Z0-9_]+$/)) continue;
      	if (typeof error[p]==='function') continue;
        result[p] = error[p];
      }
    }

    return result;
  }

  function deserialize_error(err) {
    if (!err) return err;
    var result;

    var ctorName=err['@constructor'];
    if (deserializedCtorCache.hasOwnProperty(ctorName)) {
      result = new deserializedCtorCache[ctorName];
    }
    else {
      result = createErrorInstance_uncachedCtorName(ctorName);
    }

    for (var k in err) {
      if (!result[k]) result[k]=err[k];
    }

    return result;
  }

  function createErrorInstance_uncachedCtorName(ctorName: string) {
    var result;
    ctorName = validateCtorName(ctorName);

    if (ctorName) {
      try {
        var getFromGlobal = new Function('return typeof '+ctorName+'==="undefined"?null:'+ctorName);
        var ctor = getFromGlobal();
        if (ctor) {
          result = new ctor();
          deserializedCtorCache[ctorName] = ctor;
        }
      }
      catch (error) {
      }

      if (!result) {
        var getCtor=new Function('return '+ctorName+'; function '+ctorName+'(){}');
        ctor = getCtor();
        deserializedCtorCache[ctorName] = ctor;
        result = new ctor();
      }
    }
    else {
      result = {};
    }

    return result;
  }

  function validateCtorName(ctorName: string): string {
    if (ctorName) {
      if (!/^A-Za-z0-9_$/.test(ctorName)) { // looks having non-Latin characters, let's check thoroughly
        for (var i = 0; i < ctorName.length; i++) {
          var ctorChar = ctorName.charAt(i);
          if (/^A-Za-z0-9_$/.test(ctorChar)) continue;
          else if (ctorChar.toLowerCase()!==ctorChar.toUpperCase()) continue;
          // no, this is definitely a wrong character for identifier
          ctorName = null;
          break;
        }
      }
    }
    return ctorName;
  }

}