function createComplexSerializer() {

  var maxDepth = 3;
	var dummy = {};

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
          return serializeFunction(obj);

        case 'object':
          if (!obj) return 'null';
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

  function serializeFunction(obj) {
    return obj.name ? { '@function': 'function '+obj.name+'() { /*...*/ }' } : { '@function': 'function() { /*...*/ }' };
  }

	function serializeObjectDepth(obj, depth: number) {
    var srz = {};
    if (obj.constructor && obj.constructor.name && obj.constructor.name) {
      srz['@constructor'] = obj.constructor.name;
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


	function deserialize(obj) {
    return obj;
  }

}