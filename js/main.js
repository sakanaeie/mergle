(function($) {
  var playerYoutube;
  var isAgree = false;

  // APIコードを読み込む
  $.ajax({
    url:      'https://www.youtube.com/player_api',
    dataType: 'script',
    success:  function() {
      // APIコードの読み込み完了時に呼ばれるメソッド
      window.onYouTubeIframeAPIReady = function() {
        // プレイヤーを作成する
        player = new YT.Player('youtube-player', {
          height:  '390',
          width:   '640',
          videoId: 'fJ9rUzIMcZQ',
          events: {
            'onStateChange': onPlayerStateChange,
          },
        });
      };
    },
  });

  // プレイヤーの状態変化時に呼ばれるメソッド
  function onPlayerStateChange(event) {
    if (!isAgree && event.data == YT.PlayerState.PLAYING) {
      $('#player-status').html('正常');
      isAgree = true;
    }

    if (event.data == YT.PlayerState.ENDED) {
      player.seekTo(0);
    }
  }
})(jQuery);
