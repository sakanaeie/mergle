/**
 * GET Request
 */
function doGet(e) {
  switch (e.parameter.api) {
    case 'requestUrl':
      var result = GetController.requestUrl(e.parameter.url, e.parameter.password, e.parameter.isAddOnly);
      break;
    case 'searchYoutube':
      var result = GetController.searchYoutube(e.parameter.word);
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
   */
  function requestUrl(url, password, isAddOnly) {
    isAddOnly = ('true' === isAddOnly) ? true : false;

    if (Config.password !== password) {
      return {message: 'パスワードが違います'};
    }

    var video = Youtube.fromUrl(url);
    if (video.tooManyRecentCalls) {
      return {message: 'YouTubeが検証リクエストを受理しませんでした。しばらく時間を置いてからお試しください。'};
    }
    if (null === video.id) {
      return {message: 'URLが不正です'};
    }
    if (!video.canEmbed) {
      return {message: '指定の動画は埋め込みできません'};
    }
    if (video.hasProblem()) {
      return {message: '指定の動画は音声を再生できません'};
    }

    if (!isAddOnly) {
      // スケジュールの末尾に追加する
      var schedule = new Schedule();
      var rowHash  = Sheet.makeRowHashFromVideo(video);

      if (schedule.isDuplicate(rowHash)) {
        return {message: '直近のスケジュールに含まれるため、リクエストを棄却しました'};
      } else {
        schedule.push(video);
      }
    }

    var sheet = new Sheet();
    if (!sheet.isDuplicate(video.id)) {
      sheet.add(video);
      if (isAddOnly) {
        return {message: 'マスタに追加しました'};
      } else {
        return {message: 'リクエストを受理し、マスタに追加しました'};
      }
    } else {
      if (isAddOnly) {
        return {message: '既にマスタに存在します'};
      } else {
        return {message: 'リクエストを受理しました'};
      }
    }
  }

  /**
   * youtube検索する
   */
  function searchYoutube(word) {
    return JSON.parse(YouTube.Search.list('id, snippet', {
      q: word,
      type: 'video',
      maxResults: 20,
      regionCode: 'JP',
      videoEmbeddable: true,
    }));
  }

  /**
   * 同時接続数を取得する (記録も同時に行なう)
   */
  function getConnectionCount(withSave) {
    // 再生状況を取得する
    var result = new Schedule().getStatus();
    var nowId  = 'connection' + result.now.rowHash.id;
    var pastId = 'connection' + result.past.rowHash.id;

    // ロックする
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(1000);

      // キャッシュを取得する
      var cache = CacheService.getScriptCache();

      // 現在の同時接続数を記録する
      if ('true' === withSave) {
        cache.put(nowId, (cache.get(nowId) || 0) * 1 + 1, 60 * 10);
      }

      // 前回の同時接続数を返す
      return cache.get(pastId) || false;
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
