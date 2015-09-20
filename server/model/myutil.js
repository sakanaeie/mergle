var MyUtil = (function() {
  // デバッグ用ロガー
  function log(data) {
    SpreadsheetApp
      .openById(SheetInfo.id)
      .getSheetByName(SheetInfo.nameLog)
      .appendRow([JSON.stringify(data)]);
  }

  // 現在時刻を取得する
  function getNow() {
    return Math.floor(new Date().getTime() / 1000);
  }

  // jsonpレスポンスを返す
  function responseJsonp(callbackName, obj) {
    return ContentService.createTextOutput(
      callbackName + '(' + JSON.stringify(obj) + ')'
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return {
    log:           log,
    getNow:        getNow,
    responseJsonp: responseJsonp,
  };
})();
