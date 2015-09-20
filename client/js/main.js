(function($) {
  var playerYoutube;
  var isAgree = false;
  var apiUrl  = 'https://script.google.com/macros/s/' + getGetParams()['api'] + '/exec';

  // getパラメータを取得する
  function getGetParams() {
    var data, params = {}, blocks = location.search.substring(1).split('&');
    for (var i in blocks) {
      data = blocks[i].split('=');
      params[data[0]] = data[1];
    }
    return params;
  }

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
      url:      apiUrl,
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

  // URLを送信する
  function sendUrl(isAddOnly) {
    isAddOnly = isAddOnly || false;

    // 入力を取得する
    var url      = $('#request-url').val();
    var password = $('#request-password').val();
    if ('' === url || '' === password) {
      return; // 入力がなければ無言で終了
    }

    // ボタンを押せなくする
    $('#request-button').attr( 'disabled', true);
    $('#add-only-button').attr('disabled', true);

    // くるくるを出す
    $('#request-animate').addClass('glyphicon glyphicon-refresh glyphicon-refresh-animate');

    $.ajax({
      url:      apiUrl,
      type:     'GET',
      dataType: 'jsonp',
      data: {
        api:       'sendUrl',
        url:       url,
        password:  password,
        isAddOnly: isAddOnly,
      },
      success: function(response) {
        // レスポンスのメッセージを表示させる
        $('#request-result').html(response.message + ' (' + url + ')');
      },
      complete: function() {
        // ボタンを押せるようにする
        $('#request-button').attr( 'disabled', false);
        $('#add-only-button').attr('disabled', false);

        // くるくるを消す
        $('#request-animate').removeClass('glyphicon glyphicon-refresh glyphicon-refresh-animate');
      },
    });
  }

  // binding -------------------------------------------------------------------
  $(window).load(function () {
    // 動画をリクエストする
    $('#request-button').click(function() {
      sendUrl(false);
    });

    // 動画をマスタに追加する
    $('#add-only-button').click(function() {
      sendUrl(true);
    });
  });
})(jQuery);
