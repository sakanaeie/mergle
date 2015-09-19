var Schedule = (function() {
  // constructor ---------------------------------------------------------------
  function Schedule() {
    this.now      = MyUtil.getNow();
    this.cache    = CacheService.getScriptCache();
    this.dataList = JSON.parse(this.cache.get('schedule'));
  }

  // public --------------------------------------------------------------------
  // 情報を更新する
  Schedule.prototype.update = function () {
    this.refresh_();

    var sheet = new Sheet(sheetInfo.id, sheetInfo.nameMaster, sheetInfo.column);
    while (!this.isFill_()) {
      this.add_(sheet.getOneAtRandom(), false);
    }

    this.save_();
  }

  // private -------------------------------------------------------------------
  // 最後の情報を取得する
  Schedule.prototype.getLast_ = function () {
    return (null !== this.dataList) ? this.dataList[this.dataList.length - 1] : null;
  }

  // 必要な情報が満たされているか
  Schedule.prototype.isFill_ = function () {
    var last = this.getLast_();
    return (null !== last && last.endAt >= this.now + config.makeSec);
  }

  // 情報を足す
  Schedule.prototype.add_ = function (data, isRequest) {
    var last = this.getLast_();
    if (null !== last) {
      var startAt   = last.endAt + config.gapSec;
    } else {
      var startAt   = this.now;
      this.dataList = [];
    }

    this.dataList.push({
      data:      data,
      startAt:   startAt,
      endAt:     startAt + data.duration,
      isRequest: isRequest,
    });
  }

  // キャッシュを更新する
  Schedule.prototype.save_ = function () {
    this.cache.put('schedule', JSON.stringify(this.dataList), 60 * 30);
  }

  // 不要な情報を消す
  Schedule.prototype.refresh_ = function () {
  }

  return Schedule;
})();
