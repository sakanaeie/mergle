function doGet(e) {
  switch (e.parameter.api) {
    case 'sendUrl':
      var result = GetController.sendUrl(e.parameter);
      break;
    default:
      var result = new Schedule().getStatus();
      break;
  }

  return MyUtil.responseJsonp(e.parameter.callback, result);
}

var GetController = (function() {
  function sendUrl(params) {
    var video = Youtube.fromUrl(params.url);

    if (video.tooManyRecentCalls) {
      return {message: 'YouTubeが検証リクエストを受理しませんでした。しばらく時間を置いてからお試しください。'};
    }
    if (null === video.id) {
      return {message: 'URLが不正です'};
    }
    if (null === video.response) {
      return {message: '指定の動画は削除されています'};
    }
    if (!video.canEmbed) {
      return {message: '指定の動画は埋め込みできません'};
    }

    var sheet = new Sheet(SheetInfo.id, SheetInfo.nameMaster, SheetInfo.column);
    if (!sheet.isDuplicate(video.id)) {
      sheet.add(video);
      return {message: 'マスタに追加しました'};
    } else {
      return {message: '既にマスタに存在します'};
    }
  }

  return {
    sendUrl: sendUrl,
  };
})();
