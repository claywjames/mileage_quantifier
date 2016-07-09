document.onreadystatechange = function () {
  if (document.readyState == 'complete') {
    init();
  }
};

function init() {

  const remote = require('electron').remote;

  document.getElementById('minButton').addEventListener('click', function (e) {
  const window = remote.getCurrentWindow();
  window.minimize();
  });

  document.getElementById('maxButton').addEventListener('click', function (e) {
  const window = remote.getCurrentWindow();
  if (!window.isMaximized()) {
    window.maximize();
  } else {
    window.unmaximize();
    }
  });

  document.getElementById('closeButton').addEventListener('click', function (e) {
    const window = remote.getCurrentWindow();
    window.close();
  });
}
