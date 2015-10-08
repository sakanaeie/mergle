/**
 * スケジュールの中身をログに出力する
 */
function test_loggingSchedule() {
  var schedule = new Schedule();
  for (var i in schedule.dataList) {
    Logger.log(schedule.dataList[i]);
  }
}

/**
 * YouTubeAPIを叩く
 */
function test_youtubeAPI() {
  var y = Youtube.fromUrl('');
  Logger.log(y);
}

/**
 * 評価を入れる、キャッシュを確認する
 */
function test_rating() {
  var id = 'LqudCtQ-_VY';
  var t  = 'good';
  var s  = new Sheet();

  // 評価を入れる
  s.updateRatingAndCache('youtube', id, t);

  // キャッシュを確認する
  var cache = CacheService.getScriptCache();
  Logger.log(cache.get(['youtube', id, 'good'].join(',')));
  Logger.log(cache.get(['youtube', id, 'bad' ].join(',')));
}
