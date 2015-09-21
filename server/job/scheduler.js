/**
 * スケジュールを生成する
 */
function scheduler() {
  var schedule = new Schedule();
  schedule.update();
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
