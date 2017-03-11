(function($) {
  // 共通設定 ------------------------------------------------------------------
  $.notify.defaults({
    'autoHideDelay': 6000,
  });
  var notifyStyleSettings = {
    'border':        '1px solid #fff',
    'border-radius': '4px',
    'padding':       '10px 14px',
    'text-shadow':   '0 1px 0 rgba(255, 255, 255, 0.5)',
    'white-space':   'nowrap',
  };

  function buildNotifyHtml(iconName, isAutoClose) {
    var html = '<div><span class="notify-icon glyphicon glyphicon-' + iconName + '"></span><span data-notify-text></span>';
    if (!isAutoClose) {
      html += '<span class="notify-close-icon glyphicon glyphicon-remove"><span>';
    }
    html += '</div>';
    return html;
  }

  // success -------------------------------------------------------------------
  notifyStyleSettings['background-color'] = '#dff0d8';
  notifyStyleSettings['border-color']     = '#d6e9c6';
  notifyStyleSettings['color']            = '#3c763d';
  $.notify.addStyle('success-auto', {
    html:    buildNotifyHtml('ok-sign', true),
    classes: {
      base: notifyStyleSettings,
    },
  });
  $.notify.addStyle('success', {
    html:    buildNotifyHtml('ok-sign', false),
    classes: {
      base: notifyStyleSettings,
    },
  });

  // info ----------------------------------------------------------------------
  notifyStyleSettings['background-color'] = '#d9edf7';
  notifyStyleSettings['border-color']     = '#bce8f1';
  notifyStyleSettings['color']            = '#31708f';
  $.notify.addStyle('info-auto', {
    html:    buildNotifyHtml('info-sign', true),
    classes: {
      base: notifyStyleSettings,
    },
  });
  $.notify.addStyle('info', {
    html:    buildNotifyHtml('info-sign', false),
    classes: {
      base: notifyStyleSettings,
    },
  });

  // warning -------------------------------------------------------------------
  notifyStyleSettings['background-color'] = '#fcf8e3';
  notifyStyleSettings['border-color']     = '#faebcc';
  notifyStyleSettings['color']            = '#8a6d3b';
  $.notify.addStyle('warning-auto', {
    html:    buildNotifyHtml('alert', true),
    classes: {
      base: notifyStyleSettings,
    },
  });
  $.notify.addStyle('warning', {
    html:    buildNotifyHtml('alert', false),
    classes: {
      base: notifyStyleSettings,
    },
  });

  // error ---------------------------------------------------------------------
  notifyStyleSettings['background-color'] = '#f2dede';
  notifyStyleSettings['border-color']     = '#ebccd1';
  notifyStyleSettings['color']            = '#a94442';
  $.notify.addStyle('error-auto', {
    html:    buildNotifyHtml('exclamation-sign', true),
    classes: {
      base: notifyStyleSettings,
    },
  });
  $.notify.addStyle('error', {
    html:    buildNotifyHtml('exclamation-sign', false),
    classes: {
      base: notifyStyleSettings,
    },
  });
})(jQuery);
