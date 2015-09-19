var MyUtil = (function() {
  // 現在時刻を取得する
  function getNow() {
    return Math.floor(new Date().getTime() / 1000);
  }

  return {
    getNow: getNow,
  };
})();
