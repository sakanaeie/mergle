function scheduler() {
  var schedule = new Schedule();
  schedule.update();
}

function loggingSchedule() {
  var schedule = new Schedule();
  for (var i in schedule.dataList) {
    Logger.log(schedule.dataList[i]);
  }
}
