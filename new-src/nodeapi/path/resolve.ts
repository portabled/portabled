function nopath_resolve(...pathSegments: any[]): string {

  var res = nopath_join_core(pathSegments);

  if (!/^\//.test(res))
    res = no_process.cwd() + res;

  return res;
}