var Schedule = (function() {
  // constructor ---------------------------------------------------------------
  function Schedule() {
    this.now      = MyUtil.getNow();
    this.cache    = CacheService.getScriptCache();
    this.dataList = JSON.parse(this.cache.get('schedule'));
  }

  // public --------------------------------------------------------------------
  // 情報を更新する
  Schedule.prototype.update = function() {
    this.refresh_();

    var sheet = new Sheet();
    while (!this.isFill_()) {
      // TODO リクエストを取得

      if (true) {
        // リクエストがないとき

        // マスタから取得する
        var rowHash = sheet.getOneAtRandom();

        // TODO 履歴を確認する

        // URLを検証する
        var video = new Youtube(rowHash.id);
        if (video.tooManyRecentCalls) {
          MyUtil.log('tooManyRecentCallsが検出されました');
          return;
        }

        if (video.hasProblem()) {
          // 問題があるとき、マスタシートから削除する
          sheet.remove(rowHash.index);
          continue;
        }
      }

      this.add_(rowHash, false);
    }

    this.save_();
  };

  // 情報を取得する
  Schedule.prototype.getStatus = function() {
    var futureList = [];
    for (var i in this.dataList) {
      if (this.dataList[i].endAt > this.now) {
        futureList.push(this.dataList[i])
      }
    }

    // TODO 空であるときの例外処理

    var diff = futureList[0].startAt - this.now, gap = offset = 0;
    if (0 < diff) {
      gap    = diff;      // 再生までの待ち時間
    } else {
      offset = diff * -1; // 再生経過時間
    }

    return {
      id:        futureList[0].rowHash.id,
      isRequest: futureList[0].rowHash.isRequest,
      gap:       gap,
      offset:    offset,
    };
  };

  // private -------------------------------------------------------------------
  // 最後の情報を取得する
  Schedule.prototype.getLast_ = function() {
    return (null !== this.dataList) ? this.dataList[this.dataList.length - 1] : null;
  };

  // 必要な情報が満たされているか
  Schedule.prototype.isFill_ = function() {
    var last = this.getLast_();
    return (null !== last && last.endAt >= this.now + Config.makeSec);
  };

  // 情報を足す
  Schedule.prototype.add_ = function(rowHash, isRequest) {
    var last = this.getLast_();
    if (null !== last) {
      var startAt   = last.endAt + Config.gapSec;
    } else {
      var startAt   = this.now;
      this.dataList = [];
    }

    this.dataList.push({
      rowHash:   rowHash,
      startAt:   startAt,
      endAt:     startAt + rowHash.duration,
      isRequest: isRequest,
    });
  };

  // キャッシュを更新する
  Schedule.prototype.save_ = function() {
    this.cache.put('schedule', JSON.stringify(this.dataList), 60 * 30);
  };

  // 不要な情報を消す
  Schedule.prototype.refresh_ = function() {
  };

  return Schedule;
})();
