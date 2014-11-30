module portabled.docs.types {
  
  export function listSubmodules<T>(
    parentModule: any,
    loadFunctionName: string) {
    
    var result: { moduleName: string; moduleObj: T; }[] = parentModule.__cachedSubmoduleList;

    if (!result) {
      result = parentModule.__cachedSubmoduleList = [];

      for (var moduleName in parentModule) if (parentModule.hasOwnProperty(moduleName)) {
        var moduleObj = parentModule[moduleName];
        if (moduleObj && typeof moduleObj === 'object'
          && moduleName.charAt(0).toUpperCase() !== moduleName.charAt(0)
          && moduleObj[loadFunctionName] && typeof moduleObj[loadFunctionName] === 'function'
          && moduleObj.expectsFile) {
          result.push({ moduleName: moduleName, moduleObj: moduleObj });
        }
      }
      
      parentModule.__cachedSubmoduleList = result;
    }

    return result;
  }
  
}