/**
 * スケジュールの中身をログに出力する
 */
function loggingSchedule() {
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
