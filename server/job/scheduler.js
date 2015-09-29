/**
 * スケジュールを生成する
 */
function scheduler() {
  var type = Schedule.CHOOSE_TYPE_RANDOM;

  if ('undefined' !== typeof Config.pickupEnable && Config.pickupEnable) {
    var hhii = Utilities.formatDate(new Date(), 'Asia/Tokyo' , 'HHmm');
    if (Config.pickupStart <= hhii && Config.pickupEnd > hhii) {
      type = Schedule.CHOOSE_TYPE_PICKUP;
    }
  }

  var schedule = new Schedule();
  schedule.update(type);
}

/**
 * スケジュールを再生成する
 */
function rescheduler() {
  CacheService.getScriptCache().remove('schedule');
  scheduler();
}

/**
 * スケジュールの中身をログに出力する
 */
function loggingSchedule() {
  var schedule = new Schedule();
  for (var i in schedule.dataList) {
    Logger.log(schedule.dataList[i]);
  }
}
