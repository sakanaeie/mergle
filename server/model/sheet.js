/**
 * シート
 */
var Sheet = (function() {
  // constructor ---------------------------------------------------------------
  /**
   * コンストラクタ
   */
  function Sheet() {
    this.ss = SpreadsheetApp.openById(SheetInfo.id);

    this.sheetDelete = null;
    this.sheetMaster = this.ss.getSheetByName(SheetInfo.nameMaster);
    this.rowList     = this.sheetMaster.getDataRange().getValues();
  }

  // const ---------------------------------------------------------------------
  Sheet.RATING_TYPE_GOOD = 'good';
  Sheet.RATING_TYPE_BAD  = 'bad';

  // public --------------------------------------------------------------------
  /**
   * ランダムにひとつ要素を取得する
   *
   * @return object 連想配列
   */
  Sheet.prototype.getOneAtRandom = function() {
    var rand = Math.floor(Math.random() * this.rowList.length);
    return toHash_(rand, this.rowList[rand]);
  };

  /**
   * 重複するかどうか
   *
   * @param  string id 動画id
   * @return bool      重複するかどうか, する:true / しない:false
   */
  Sheet.prototype.isDuplicate = function(id) {
    key = SheetInfo.column.id;
    for (var i in this.rowList) {
      if (id === this.rowList[i][key]) {
        return true;
      }
    }
    return false;
  };

  /**
   * 追加する
   *
   * @param Youtube video 動画情報
   */
  Sheet.prototype.add = function(video) {
    var row = Sheet.makeRowFromVideo(video);

    // シートと配列に追加する
    this.sheetMaster.appendRow(row);
    this.rowList.push(row);
  };

  /**
   * 削除シートの内容を取得する
   *
   * @return array 削除シートの内容
   */
  Sheet.prototype.getDeleteList = function() {
    return this.getSheetDelete_().getDataRange().getValues();
  }

  /**
   * マスタシートから削除シートへ移動する
   *
   * @param int index this.rowListのキー
   */
  Sheet.prototype.remove = function(index) {
    var row = this.rowList[index];

    // 削除シートに追加する
    this.getSheetDelete_().appendRow(row);

    // マスタシートと配列から削除する
    this.sheetMaster.deleteRow(index * 1 + 1);
    this.rowList.splice(index, 1);
  }

  /**
   * 評価を更新し、キャッシュに入れる
   *
   * @param  string provider 動画提供元
   * @param  string id       動画id
   * @param  string type     評価種別, 不正な値であるときはキャッシュ更新のみ行なう
   * @return bool   result   評価を更新したかどうか
   */
  Sheet.prototype.updateRatingAndCache = function(provider, id, type) {
    var index = null, providerKey = SheetInfo.column.provider, idKey = SheetInfo.column.id;
    for (var i in this.rowList) {
      if (this.rowList[i][providerKey] === provider && this.rowList[i][idKey] === id) {
        index = i;
        break;
      }
    }

    var result = false;
    if (null !== index) {
      if (Sheet.RATING_TYPE_GOOD === type || Sheet.RATING_TYPE_BAD === type) {
        // セルを特定し、値をインクリメントする
        var column = SheetInfo.column[type];
        var cell = this.sheetMaster.getRange(index * 1 + 1, column * 1 + 1);
        var val  = cell.getValue() * 1 + 1;
        cell.setValue(val);

        // 配列も値も更新する
        this.rowList[index][column] = val;

        result = true;
      }

      // キャッシュに入れておく
      var cache = CacheService.getScriptCache();
      cache.put(
        [provider, id, Sheet.RATING_TYPE_GOOD].join(','),
        this.rowList[index][SheetInfo.column.good],
        60 * 60 * 6
      );
      cache.put(
        [provider, id, Sheet.RATING_TYPE_BAD].join(','),
        this.rowList[index][SheetInfo.column.bad],
        60 * 60 * 6
      );
    }

    return result;
  };

  // private -------------------------------------------------------------------
  /**
   * 削除シートを取得する
   *
   * @return Sheet this.sheetDelete 削除シート
   */
  Sheet.prototype.getSheetDelete_ = function() {
    if (null === this.sheetDelete) {
      this.sheetDelete = this.ss.getSheetByName(SheetInfo.nameDelete);
    }
    return this.sheetDelete;
  }

  // public static -------------------------------------------------------------
  /**
   * 行データに整形する
   *
   * @param  Youtube video 動画情報
   * @return array   arr   行データと同形式の配列
   */
  Sheet.makeRowFromVideo = function(video) {
    var val, arr = [];
    for (var name in SheetInfo.column) {
      switch (name) {
        case 'provider':
        case 'id':
        case 'url':
        case 'title':
        case 'duration':
          val = video[name];
          break;
        case 'good':
        case 'bad':
          val = 0;
          break;
        case 'createdAt':
          val = MyUtil.getNow();
          break;
      }

      arr[SheetInfo.column[name]] = val;
    }

    return arr;
  }

  /**
   * 連想配列化された行データに整形する
   *
   * @param  Youtube video 動画情報
   * @return object        連想配列
   */
  Sheet.makeRowHashFromVideo = function(video) {
    return toHash_(null, Sheet.makeRowFromVideo(video));
  }

  // private static ------------------------------------------------------------
  /**
   * 連想配列化する
   *
   * @param  int index this.rowListのキー
   * @param  arr row   配列
   * @return object    連想配列
   */
  function toHash_(index, row) {
    var key, hash = {index: index};
    for (var name in SheetInfo.column) {
      key        = SheetInfo.column[name];
      hash[name] = ('undefined' !== typeof row[key]) ? row[key] : null;
    }
    return hash;
  };

  return Sheet;
})();
