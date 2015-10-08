/**
 * ユーティリティ
 */
var MyUtil = (function() {
  var sheetLog = null;

  /**
   * デバッグ用ロガー
   *
   * @param mixed mixData ロギングしたいもの
   */
  function log(mixData) {
    if (null === sheetLog) {
      sheetLog = SpreadsheetApp.openById(SheetInfo.id).getSheetByName(SheetInfo.nameLog);
    }
    sheetLog.appendRow([new Date(), JSON.stringify(mixData)]);
  }

  /**
   * 現在時刻を取得する
   *
   * @return タイムスタンプ (秒)
   */
  function getNow() {
    return Math.floor(new Date().getTime() / 1000);
  }

  /**
   * jsonpレスポンスを返す
   *
   * @param  string callbackName コールバック名
   * @param  object obj          レスポンスデータ
   * @return string              jsonpレスポンス
   */
  function responseJsonp(callbackName, obj) {
    return ContentService.createTextOutput(
      callbackName + '(' + JSON.stringify(obj) + ')'
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  /**
   * UrlFetch (リトライ付き)
   *
   * @param  string       url    アクセス先URL
   * @return HTTPResponse result fetchのレスポンス
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
