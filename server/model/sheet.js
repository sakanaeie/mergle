var Sheet = (function() {
  // constructor ---------------------------------------------------------------
  function Sheet() {
    this.ss = SpreadsheetApp.openById(SheetInfo.id);

    this.sheetDelete = this.sheetLog = null;
    this.sheetMaster = this.ss.getSheetByName(SheetInfo.nameMaster);
    this.rowList     = this.sheetMaster.getDataRange().getValues();
  }

  // public --------------------------------------------------------------------
  // ランダムにひとつ要素を取得する
  Sheet.prototype.getOneAtRandom = function() {
    var rand = Math.floor(Math.random() * this.rowList.length);
    return toHash_(rand, this.rowList[rand]);
  };

  // 重複するかどうか
  Sheet.prototype.isDuplicate = function(id) {
    key = SheetInfo.column.id;
    for (var i in this.rowList) {
      if (id === this.rowList[i][key]) {
        return true;
      }
    }
    return false;
  };

  // 追加する
  Sheet.prototype.add = function(video) {
    var row = Sheet.makeRowFromVideo(video);

    // シートと配列に追加する
    this.sheetMaster.appendRow(row);
    this.rowList.push(row);
  };

  // マスタシートから削除シートへ移動する
  Sheet.prototype.remove = function(index) {
    var row = this.rowList[index];

    // 削除シートに追加する
    this.getSheetDelete_().appendRow(row);

    // マスタシートと配列から削除する
    this.sheetMaster.deleteRow(index * 1 + 1);
    this.rowList.splice(index, 1);
  }

  // ログを残す
  Sheet.prototype.log = function(mixData) {
    this.getSheetLog_().appendRow([new Date(), JSON.stringify(mixData)]);
  }

  // private -------------------------------------------------------------------
  // 削除シートを取得する
  Sheet.prototype.getSheetDelete_ = function() {
    if (null === this.sheetDelete) {
      this.sheetDelete = this.ss.getSheetByName(SheetInfo.nameDelete);
    }
    return this.sheetDelete;
  }

  // ログシートを取得する
  Sheet.prototype.getSheetLog_ = function() {
    if (null === this.sheetLog) {
      this.sheetLog = this.ss.getSheetByName(SheetInfo.nameLog);
    }
    return this.sheetLog;
  }

  // public static -------------------------------------------------------------
  // 行データに整形する
  Sheet.makeRowFromVideo = function(video) {
    return [
        video.provider,
        video.id,
        video.url,
        video.title,
        video.duration,
    ];
  }

  // 連想配列化された行データに整形する
  Sheet.makeRowHashFromVideo = function(video) {
    return toHash_(null, Sheet.makeRowFromVideo(video));
  }

  // private static ------------------------------------------------------------
  // 連想配列化する
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
