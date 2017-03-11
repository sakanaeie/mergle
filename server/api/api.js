/**
 * GET Request
 */
function doGet(e) {
  switch (e.parameter.api) {
    case 'requestUrl':
      var result = GetController.requestUrl(e.parameter.url, e.parameter.isAddOnly);
      break;

    case 'searchYoutube':
      var result = GetController.searchYoutube(e.parameter.word, e.parameter.token);
      break;

    case 'master':
      var result = {
        column: SheetInfo.column,
        master: new Sheet().rowList,
      };
      break;

    case 'deleted':
      var result = {
        column:  SheetInfo.column,
        deleted: new Sheet().getDeleteList(),
      };
      break;

    case 'connectionCount':
      var result = {
        count: GetController.getConnectionCount(e.parameter.withSave),
      };
      break;

    case 'rating':
      var result = {
        result: new Sheet().updateRatingAndCache(e.parameter.provider, e.parameter.id, e.parameter.type),
      };
      break;

    default:
      var result = new Schedule().getStatus();
      break;
  }

  return MyUtil.responseJsonp(e.parameter.callback, result);
}

/**
 * controller
 */
var GetController = (function() {
  /**
   * 動画のリクエストを受信する
   *
   * @param  string url       動画URL
   * @param  string isAddOnly マスタ追加のみかどうか
   * @return object           レスポンスデータ
   */
  function requestUrl(url, isAddOnly) {
    isAddOnly = ('true' === isAddOnly) ? true : false;

    // 検証する
    var video = Youtube.fromUrl(url);
    if (video.hasError) {
      return {
        message: 'YouTubeが検証リクエストを受理しませんでした。しばらく時間を置いてからお試しください。',
        result:  'error',
      };
    }
    if (null === video.id) {
      return {
        message: 'URLが不正です。',
        result:  'error',
      };
    }
    if (!video.canEmbed) {
      return {
        message: '指定の動画は埋め込みできません。',
        result:  'error',
      };
    }
    if (video.hasProblem()) {
      return {
        message: '指定の動画は音声を再生できません。',
        result:  'error',
      };
    }
    if (video.tooLong()) {
      return {
        message: Config.limitSec + '秒を超える動画の指定はご遠慮ください。',
        result:  'error',
      };
    }

    var title = '"' + video.title + '" ';

    // マスタに追加する
    var sheet = new Sheet(), isDuplicateInMaster = sheet.isDuplicate(video.id);
    if (!isDuplicateInMaster) {
      sheet.add(video);
    }

    if (isAddOnly) {
      if (isDuplicateInMaster) {
        return {
          message: title + 'は、既にマスタに存在します。',
          result:  'warning',
        };
      } else {
        return {
          message: title + 'をマスタに追加しました。',
          result:  'success',
        };
      }
    } else {
      // スケジュールの末尾に追加する
      var schedule = new Schedule();
      var rowHash  = Sheet.makeRowHashFromVideo(video);
      if (schedule.isDuplicate(rowHash)) {
        return {
          message: title + 'は、直近のスケジュールに含まれるため、リクエストを棄却しました。',
          result:  'warning',
        };
      } else {
        schedule.push(video); // 追加する
        if (isDuplicateInMaster) {
          return {
            message: title + 'のリクエストを受理しました。',
            result:  'success',
          };
        } else {
          return {
            message: title + 'のリクエストを受理し、マスタに追加しました。',
            result:  'success',
          };
        }
      }
    }
  }

  /**
   * youtube検索する
   *
   * @param  string word  検索ワード
   * @param  string token ページング用トークン
   * @return object       YouTubeAPIのレスポンス
   */
  function searchYoutube(word, token) {
    var options = {
      q: word,
      type: 'video',
      maxResults: 5,
      regionCode: 'JP',
      videoEmbeddable: true,
    };

    if ('undefined' !== typeof token) {
      options.pageToken = token;
    }

    return JSON.parse(YouTube.Search.list('id, snippet', options));
  }

  /**
   * 同時接続数を取得する (記録も同時に行なう)
   *
   * @param  string      withSave 記録も同時に行なうかどうか
   * @return string|bool          同時接続数, 取得できないときなどはfalse
   */
  function getConnectionCount(withSave) {
    // 再生状況を取得する
    var result = new Schedule().getStatus();
    var nowId  = 'connection' + result.now.rowHash.id;
    var pastId = 'connection' + result.past.rowHash.id;

    // ロックする
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(4000);

      // キャッシュを取得する
      var cache = CacheService.getScriptCache();

      // 現在の同時接続数を記録する
      if ('true' === withSave) {
        cache.put(nowId, (cache.get(nowId) || 0) * 1 + 1, 60 * 20);
      }

      // 前回の同時接続数を返す
      var count = cache.get(pastId) || false;

      // ロックを明示的に開放する
      lock.releaseLock();

      return count;
    } catch (e) {
      MyUtil.log(['同時接続数の取得、記録に失敗しました', e]);
      return false;
    }
  }

  return {
    requestUrl:         requestUrl,
    searchYoutube:      searchYoutube,
    getConnectionCount: getConnectionCount,
  };
})();
