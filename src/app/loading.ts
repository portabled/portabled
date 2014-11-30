module portabled.app {
  
  var loadingHostDIV: HTMLElement;
  var loadingTitleDIV: HTMLElement;
  var loadingProgressDIV: HTMLElement;

  var loadingTimeout: number = 0;

  // baseUI, domFilesystem, flyoutUI, libraries
  var currentDescription;

  export function loading(description) {

    if (!loadingHostDIV) {
      loadingHostDIV = document.getElementById('portabled-loading-host');
      loadingTitleDIV = document.getElementById('portabled-loading-title');
      loadingProgressDIV = document.getElementById('portabled-loading-progress');
    }

    if (description) {
      loadingHostDIV.style.display = 'block';
    }
    else {
      loadingHostDIV.style.display = 'none';
      return;
    }

    currentDescription = description;
    if ('textContent' in loadingTitleDIV)
      loadingTitleDIV.textContent = currentDescription;
    else
      loadingTitleDIV.innerText = currentDescription;
  }
  
  
}