/**
 * ユーティリティ
 */
var MyUtil = (function() {
  /**
   * デバッグ用ロガー
   */
  function log(mixData) {
    var sheet = new Sheet();
    sheet.log([new Date(), JSON.stringify(mixData)]);
  }

  /**
   * 現在時刻を取得する
   */
  function getNow() {
    return Math.floor(new Date().getTime() / 1000);
  }

  /**
   * jsonpレスポンスを返す
   */
  function responseJsonp(callbackName, obj) {
    return ContentService.createTextOutput(
      callbackName + '(' + JSON.stringify(obj) + ')'
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  /**
   * UrlFetch (リトライ付き)
   */
  function fetchWithRetry(url) {
    var result, i = 0;

    while (i++ < 5) {
      try {
        result = UrlFetchApp.fetch(url);
        break;
      } catch (e) {
        if (
             -1 !== e.message.indexOf('Exception: タイムアウト: ')
          || -1 !== e.message.indexOf('Exception: 予期しないエラー: ')
          || -1 !== e.message.indexOf('Exception: 使用できないアドレス: ')
        ) {
          // よくある例外は、5秒の待ちを挟んで再実行する
          Common.insertErrorLog(['fetchWithRetry 3秒待ち後、再実行します', e]);
          Utilities.sleep(5000);
        } else {
          // よくない例外は、上に投げる
          Common.insertErrorLog(['fetchWithRetry 例外を投げます', e]);
          throw e;
        }
      }
    }

    return result;
  }



  return {
    log:            log,
    getNow:         getNow,
    responseJsonp:  responseJsonp,
    fetchWithRetry: fetchWithRetry,
  };
})();
