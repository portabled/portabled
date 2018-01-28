function createComplexSerializer(self?: any) {
  if (!self) self = (function(){return this;})();

  var maxDepth = 8;
	var dummy = {};
  var dummyArray = [];
  var dummyError = new Error();
  var dummyFunction = function() { };
  var knownErrorProps = [
    'message', 'name',
    'stack',
    'fileName', 'lineNumber', 'columnNumber',
    'description', 'number', 'stackTraceLimit'
  ];

  var deserializedCtorCache = {};
  var deserializedFnCache = {};

  return {
    serialize: serialize,
    deserialize: deserialize
  };

  function serialize(obj) {
    return serializeDepth(obj, 0);
  }

  function serializeDepth(obj, depth: number) {
    try {
      switch (typeof obj) {
        case 'function':
          return serializeFunctionDepth(obj, depth);

        case 'object':
          if (!obj) return null;
          if (obj instanceof Error) return serialize_error(obj);
          if ((Array.isArray && Array.isArray(obj)) || obj instanceof Array) return serializeArrayDepth(obj, depth);
          return serializeObjectDepth(obj, depth);

        default:
          return obj;
      }
    }
    catch (error) {
      return { '@unserializable': error.message };
    }

  }

  function serializeFunctionDepth(obj, depth: number) {
    var result = obj.name ?
      {
      	'@function': 'function '+obj.name+'() { /*...*/ }',
      	'@function.name': obj.name
    	} :
    	{
      	'@function': 'function() { /*...*/ }'
    	};
    for (var k in obj) {
      if (!(k in dummyFunction)) {
        result[k] = serializeObjectDepth(obj[k], depth+1);
      }
    }
    return result;
  }

	function serializeObjectDepth(obj, depth: number) {
    var srz = {};
    if (obj.constructor && obj.constructor.name && obj.constructor.name) {
      var ctorName = obj.constructor.name;
      if (ctorName!=='Object')
      	srz['@constructor'] = ctorName;
    }

    var propCount = 0;
    for (var k in obj) if (!(k in dummy)) {
      if (depth>maxDepth) {
        propCount++;
        continue;
      }

      var fail = false;
      try {
      	var kval = obj[k];
      }
      catch (error) {
        srz[k] = { '@unserializable': error.message };
        fail = true;
      }

      if (!fail)
      	srz[k] = serializeDepth(obj[k], depth+1);
    }

    if (depth>maxDepth && propCount) {
      srz['...'] = propCount;
    }

    return srz;
  }

	function serializeArrayDepth(arr, depth: number) {

    if (depth>maxDepth && arr.length) {
      return ['...'];
    }

    var result: any[] = [];

    for (var i = 0; i < arr.length; i++) {
      var srz = serializeDepth(arr[i], depth+1);
      if (typeof srz==='undefined') continue;
      result[i] = srz;
    }

    return result;
  }

  function serialize_error(error) {

    var result: any = {};

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

    for (var i = 0; i < knownErrorProps.length; i++) {
      var p = knownErrorProps[i];
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

    if (result.stack) {
      var lines = result.stack.split('\n');
      for (var i = lines.length-1; i>=0; i--) {
        if (/\beval\b/.test(lines[i])) {
          if (i) result.stack = lines.slice(0, i).join('\n');
          else result.stack = lines.slice(0, i+1).join('\n');
          break;
        }
      }
    }

    return result;
  }

	function deserialize(obj) {
    if (typeof obj!=='object' || obj===null)
      return obj;

    if ((Array.isArray && Array.isArray(obj)) || obj instanceof Array) return deserializeArray(obj);
    return deserializeObject(obj);
  }

  function deserializeObject(obj) {

    if (!obj || typeof obj!=='object')
      return obj;

    if ('@__cache' in obj)
      return obj['@__cache'];

    var fnDeclText = obj['@function'];
    var fnDeclName = obj['@function.name'];

    if (fnDeclText) {
      var fnDecl = deserializedFnCache[fnDeclText];
      if (fnDecl) return fnDecl;
      try {
      	if (fnDeclName)
        	var fnDeclFn = Function('return '+fnDeclName+';\n'+fnDeclText);
        else
        	var fnDeclFn = Function('return '+fnDeclText);
        fnDecl = fnDeclFn();
        deserializedFnCache[fnDeclText] = fnDecl;
        obj['@__cache'] = fnDecl;
        return fnDecl;
      }
      catch (error) {
      }
    }

    var ctorName = obj['@constructor'];
    var result = createInstance_uncachedCtorName(ctorName);
    for (var k in obj) {
      if (k!=='@constructor' && !(k in dummy) && k!=='@__cache') {
        result[k] = deserializeObject(obj[k]);
      }
    }
    obj['@__cache'] = result;
    return result;
  }

  function deserializeArray(obj) {
    var result = [];
    for (var k in obj) if (!(k in dummyArray) && k!=='@__cache') {
      result[k] = deserialize(obj[k]);
    }
    obj['@__cache'] = obj;
    return result;
  }

  function createInstance_uncachedCtorName(ctorName: string) {
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