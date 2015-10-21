/**
 * スケジュール
 */
var Schedule = (function() {
  // constructor ---------------------------------------------------------------
  /**
   * コンストラクタ
   */
  function Schedule() {
    this.sheet    = null;
    this.cache    = CacheService.getScriptCache();
    this.dataList = JSON.parse(this.cache.get('schedule'));
  }

  // const ---------------------------------------------------------------------
  Schedule.CHOOSE_TYPE_RANDOM  = 1;
  Schedule.CHOOSE_TYPE_REQUEST = 2;
  Schedule.CHOOSE_TYPE_PICKUP  = 3;
  Schedule.CHOOSE_TYPE_JOCKEY  = 4;

  // public --------------------------------------------------------------------
  /**
   * 情報を追加する
   *
   * @param object rowHash 連想配列
   */
  Schedule.prototype.push = function(rowHash) {
    this.refresh_();
    this.add_(rowHash, Schedule.CHOOSE_TYPE_REQUEST);
    this.save_();
  };

  /**
   * 情報を更新する
   *
   * @param int    chooseType 選曲種別
   * @param object jockeyInfo 選曲者情報
   */
  Schedule.prototype.update = function(chooseType, jockeyInfo) {
    if (this.isFill_()) {
      return;
    }

    // 不要な情報を消す
    this.refresh_();

    // 選曲する
    switch (chooseType) {
      case Schedule.CHOOSE_TYPE_RANDOM:
        this.chooseRandom_();
        break;
      case Schedule.CHOOSE_TYPE_PICKUP:
        this.choosePickup_();
        break;
      case Schedule.CHOOSE_TYPE_JOCKEY:
        this.chooseJockey_(jockeyInfo);
        break;
    }

    // 保存する
    this.save_();
  };

  /**
   * 重複するかどうか
   *
   * @param  object rowHash 連想配列
   * @return bool           重複するかどうか, する:true / しない:false
   */
  Schedule.prototype.isDuplicate = function(rowHash) {
    for (var i in this.dataList) {
      if (rowHash.provider === this.dataList[i].rowHash.provider && rowHash.id === this.dataList[i].rowHash.id ) {
        return true;
      }
    }
    return false;
  };

  /**
   * 再生状況を取得する
   *
   * @return object result 再生状況
   */
  Schedule.prototype.getStatus = function() {
    var now = MyUtil.getNow();
    var past, futureList = [];
    for (var i in this.dataList) {
      if (this.dataList[i].endAt > now) {
        futureList.push(this.dataList[i])
      } else {
        past = this.dataList[i];
      }
    }

    // TODO 空であるときの例外処理

    var diff = futureList[0].startAt - now, gap = offset = 0;
    if (0 < diff) {
      gap    = diff;      // 再生までの待ち時間
    } else {
      offset = diff * -1; // 再生経過時間
    }

    var result = {
      future: futureList[1],
      now:    futureList[0],
      past:   past,
      gap:    gap,
      offset: offset,
      rating: {},
    };

    // キャッシュから評価を取得する
    var provider, id, str, strArr = ['future', 'now', 'past'];
    for (var i in strArr) {
      str = strArr[i];
      if ('undefined' !== typeof result[str]) {
        provider = result[str].rowHash.provider;
        id       = result[str].rowHash.id;
        result.rating[str] = {
          good: this.cache.get([provider, id, Sheet.RATING_TYPE_GOOD].join(',')) || 0,
          bad:  this.cache.get([provider, id, Sheet.RATING_TYPE_BAD ].join(',')) || 0,
        };
      }
    }

    return result;
  };

  // private -------------------------------------------------------------------
  /**
   * 最後の情報を取得する
   *
   * @return object|null 最後の情報
   */
  Schedule.prototype.getLast_ = function() {
    return (null !== this.dataList) ? this.dataList[this.dataList.length - 1] : null;
  };

  /**
   * 必要な情報が満たされているか
   *
   * @return bool 満たされているかどうか, いる:true / いない:false
   */
  Schedule.prototype.isFill_ = function() {
    var last = this.getLast_();
    return (null !== last && last.endAt >= MyUtil.getNow() + Config.makeSec);
  };

  /**
   * 情報を足す
   *
   * @param object rowHash    連想配列
   * @param int    chooseType 選曲種別
   * @param object jockeyInfo 選曲者情報
   */
  Schedule.prototype.add_ = function(rowHash, chooseType, jockeyInfo) {
    var last = this.getLast_();
    if (null !== last) {
      var startAt   = last.endAt + Config.gapSec;
    } else {
      var startAt   = MyUtil.getNow();
      this.dataList = [];
    }

    this.dataList.push({
      rowHash:    rowHash,
      startAt:    startAt,
      endAt:      startAt + rowHash.duration * 1,
      chooseType: chooseType,
      jockeyInfo: jockeyInfo,
    });

    // 評価をキャッシュに入れる
    this.getSheet_().updateRatingAndCache(rowHash.provider, rowHash.id);
  };

  /**
   * 不要な情報を消す
   */
  Schedule.prototype.refresh_ = function() {
    // 過去の情報の数を算出する
    var pastCount = 0;
    for (var i in this.dataList) {
      if (this.dataList[i].endAt <= MyUtil.getNow()) {
        pastCount++;
      }
    }

    // 履歴としても使われない分を取り除く
    var delCount = pastCount - Config.historyCount;
    for (var i = 0; i < delCount; i++) {
      this.dataList.shift();
    }
  };

  /**
   * キャッシュを更新する
   */
  Schedule.prototype.save_ = function() {
    this.cache.put('schedule', JSON.stringify(this.dataList), 60 * 60 * 6);
  };

  /**
   * マスタからランダムに選曲する
   */
  Schedule.prototype.chooseRandom_ = function() {
    var sheet = this.getSheet_(), video, rowHash, retry = 0;
    do {
      // マスタから取得する
      rowHash = sheet.getOneAtRandom();

      // 履歴を確認する
      if (retry < 20 && this.isDuplicate(rowHash)) {
        retry++;  // 母数が不足しているときなどに発生しうる無限ループを抑止
        continue;
      }

      // URLを検証する
      video = new Youtube(rowHash.id);
      if (video.hasError) {
        return;
      }

      if (video.hasProblem()) {
        // 問題があるとき、マスタシートから削除する
        sheet.remove(rowHash.index);
        continue;
      }

      this.add_(rowHash, Schedule.CHOOSE_TYPE_RANDOM);
    } while (!this.isFill_());
  };

  /**
   * youtube公式音楽プレイリストからランダムに選曲する
   */
  Schedule.prototype.choosePickup_ = function() {
    var pickupList = [];
    for (var i in YoutubePickupListIds) {
      pickupList = pickupList.concat(
        YouTube.PlaylistItems.list('snippet', {
          playlistId: YoutubePickupListIds[i],
          maxResults: 50,
        }).items
      );
    }
    var pickupListCount = pickupList.length;

    var item, video, rowHash, retry = 0;
    do {
      // プレイリストから取得する
      item = pickupList[Math.floor(Math.random() * pickupListCount)];

      // 動画情報を取得する
      video = new Youtube(item.snippet.resourceId.videoId);
      if (video.hasError) {
        return;
      }
      if (video.hasProblem() || video.tooLong()) {
        continue;
      }

      // 履歴を確認する
      rowHash = Sheet.makeRowHashFromVideo(video);
      if (retry < 20 && this.isDuplicate(rowHash)) {
        retry++;  // 母数が不足しているときなどに発生しうる無限ループを抑止
        continue;
      }

      this.add_(rowHash, Schedule.CHOOSE_TYPE_PICKUP);
    } while (!this.isFill_());
  };

  /**
   * 指定プレイリストからランダムに選曲する
   *
   * @param object jockeyInfo 選曲者情報
   */
  Schedule.prototype.chooseJockey_ = function(jockeyInfo) {
    var items = YouTube.PlaylistItems.list('snippet', {
      playlistId: jockeyInfo.id,
      maxResults: 50, // TODO 全件取得できるか？
    }).items;
    var count = items.length;

    var item, video, rowHash, retry = 0;
    do {
      // 順番に取る TODO ということもしたい
//      item = items.shift();

      // プレイリストから取得する
      item = items[Math.floor(Math.random() * count)];

      // 動画情報を取得する
      video = new Youtube(item.snippet.resourceId.videoId);
      if (video.hasError) {
        return;
      }
      if (video.hasProblem() || video.tooLong()) {
        // TODO toolongは必要なく、指定時間であれば許容する形態とする
        continue;
      }

      // 履歴を確認する
      rowHash = Sheet.makeRowHashFromVideo(video);
      if (retry < 20 && this.isDuplicate(rowHash)) {
        retry++;  // 母数が不足しているときなどに発生しうる無限ループを抑止
        continue;
      }

      this.add_(rowHash, Schedule.CHOOSE_TYPE_JOCKEY, jockeyInfo);
    } while (!this.isFill_());
  };

  /**
   * Sheetインスタンスを取得する
   *
   * @return Sheet this.sheet Sheetインスタンス
   */
  Schedule.prototype.getSheet_ = function() {
    if (null === this.sheet) {
      this.sheet = new Sheet();
    }
    return this.sheet;
  };

  return Schedule;
})();
