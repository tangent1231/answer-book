(function () {
  'use strict';
  // Shared by the reader and the content-layout check. Never shrink answers below 22px.
  window.OracleTypography = {
    fit: function (text, page) {
      text.style.fontSize = '';
      var ceiling = page.clientHeight * .48;
      var size = parseFloat(window.getComputedStyle(text).fontSize);
      while (text.offsetHeight > ceiling && size > 22) {
        size -= 1;
        text.style.fontSize = size + 'px';
      }
    }
  };
}());
