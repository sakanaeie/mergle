var MyUtil = (function() {
  // 現在時刻を取得する
  function getNow() {
    return Math.floor(new Date().getTime() / 1000);
  }

  // jsonレスポンスを返す
  function responseJson(obj) {
    return ContentService.createTextOutput(
      JSON.stringify(obj)
    ).setMimeType(ContentService.MimeType.JSON);
  }

  return {
    getNow:       getNow,
    responseJson: responseJson,
  };
})();
