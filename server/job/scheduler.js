/**
 * スケジュールを生成する
 */
function scheduler() {
  // プロセスが重複しないようにする
  var lock = LockService.getScriptLock();
  try {
    // 既にロックされていたら例外が発生する
    lock.waitLock(0); // 0msのロック開放待ち
  } catch (e) {
    MyUtil.log(['スケジュール生成時のロックで例外が発生しました (プロセスの重複)', e]);
    return;
  }

  var type = Schedule.CHOOSE_TYPE_RANDOM;
  var hhii = Utilities.formatDate(new Date(), 'Asia/Tokyo' , 'HHmm');

  // ピックアップモードであるかどうか
  if (Config.pickupEnable && Config.pickupStart <= hhii && Config.pickupEnd > hhii) {
    type = Schedule.CHOOSE_TYPE_PICKUP;
  }

  // ジョッキーモードであるかどうか
  var jockeyInfo;
  if (Config.jockeyEnable) {
    for (var i in YoutubeJockeyInfos) {
      if (YoutubeJockeyInfos[i].start <= hhii && YoutubeJockeyInfos[i].end > hhii) {
        type       = Schedule.CHOOSE_TYPE_JOCKEY;
        jockeyInfo = YoutubeJockeyInfos[i];
        break;
      }
    }
  }

  var schedule = new Schedule();
  schedule.update(type, jockeyInfo);
}

/**
 * スケジュールを再生成する
 */
function rescheduler() {
  CacheService.getScriptCache().remove('schedule');
  scheduler();
}
