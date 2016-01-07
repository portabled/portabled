module nojq {

  export function noajax(drive: persistence.Drive, basePath: string, window: Window) {
    var existingAjax = window['$'] ? window['$']['ajax'] : null;
    return (options: noajax.Options) => {
      var dt = drive.read(basePath + options.url);
      if (dt) {
        options.success(dt);
      }
      else {
        if (typeof console !== 'undefined' && console && console.error)
          console.error('No data found for ', options);
        options.error(new Error('No data found for '+options.url));
      }
    };
/*
$.ajax({
					url: file,
					dataType: 'string',
					success: function(data) {
						if(!data) {
							$(useFallback);
							return;
						}
						svgdoc = parser.parseFromString(data, "text/xml");
						$(function() {
							getIcons('ajax');
						});
					},
          error: function(err) {
          })
*/
  }

  export module noajax {
    export interface Options {
      url: string;
      dataType: string;
      success: (data: any) => void;
      error: (err: Error) => void;
    }
  }
}