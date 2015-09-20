var Sheet = (function() {
  // constructor ---------------------------------------------------------------
  function Sheet(id, name, column) {
    var ss = SpreadsheetApp.openById(id); // TODO シングルトン化

    this.sheet    = ss.getSheetByName(name);
    this.dataList = this.sheet.getDataRange().getValues();
    this.column   = column;
  }

  // public --------------------------------------------------------------------
  // ランダムにひとつ要素を取得する
  Sheet.prototype.getOneAtRandom = function() {
    return this.toHash_(this.dataList[Math.floor(Math.random() * this.dataList.length)]);
  };

  // 重複するかどうか
  Sheet.prototype.isDuplicate = function(id) {
    key = this.column.id;
    for (var i in this.dataList) {
      if (id === this.dataList[i][key]) {
        return true;
      }
    }
    return false;
  };

  // 追加する
  Sheet.prototype.add = function(video) {
    var row = [
        this.dataList.length + 1,
        video.provider,
        video.id,
        video.url,
        video.title,
        video.duration,
    ];

    // シートと配列に追加する
    this.sheet.appendRow(row);
    this.dataList.push(row);
  };

  // private -------------------------------------------------------------------
  // 連想配列化する
  Sheet.prototype.toHash_ = function(data) {
    var key, hash = {};
    for (var name in this.column) {
      key        = this.column[name];
      hash[name] = ('undefined' !== typeof data[key]) ? data[key] : null;
    }
    return hash;
  };

  return Sheet;
})();
