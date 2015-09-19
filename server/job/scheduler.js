function test() {
//  CacheService.getScriptCache().remove('schedule');

  var schedule = new Schedule();
  schedule.update();

  var schedule = new Schedule(); // cacheとりなおし
  for (var index in schedule.dataList) {
    Logger.log(schedule.dataList[index]);
  }
}
