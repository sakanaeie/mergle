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
  Sheet.prototype.getOneAtRandom = function () {
    return this.toHash_(this.dataList[Math.floor(Math.random() * this.dataList.length)]);
  }

  // private -------------------------------------------------------------------
  // 連想配列化する
  Sheet.prototype.toHash_ = function (data) {
    var key, hash = {};
    for (var name in this.column) {
      key        = this.column[name];
      hash[name] = ('undefined' !== typeof data[key]) ? data[key] : null;
    }
    return hash;
  }

  return Sheet;
})();
