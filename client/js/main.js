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
        playerYoutube = new YT.Player('youtube-player', {
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

  // getパラメータを取得する
  function getGetParams() {
    var data, params = {}, blocks = location.search.substring(1).split('&');
    for (var i in blocks) {
      data = blocks[i].split('=');
      params[data[0]] = data[1];
    }
    return params;
  }

  // プレイヤーの状態変化時に呼ばれるメソッド
  function onPlayerStateChange(event) {
    if (!isAgree && event.data == YT.PlayerState.PLAYING) {
      $('#player-status').html('正常');
      isAgree = true;
      syncPlayer();
    }

    if (event.data == YT.PlayerState.ENDED) {
      if ($('#loop').hasClass('loop-on')) {
        playerYoutube.seekTo(0); // 冒頭にシークする
      } else {
        syncPlayer();
      }
    }
  }

  // サーバと同期する
  function syncPlayer() {
    $.ajax({
      url:      'https://script.google.com/macros/s/' + getGetParams()['api'] + '/exec',
      type:     'GET',
      dataType: 'jsonp',
      success: function(response) {
        // 取得したidで、動画を読み込み再生する
        setTimeout(function() {
          playerYoutube.loadVideoById(response.id, response.offset || 0);
        }, response.gap || 0);
      },
      complete: function() {
      },
    });
  }
})(jQuery);
