(function($) {
  var playerYoutube;
  var getParams = getGetParams();
  var isAgree = isLoop = isMute = false;
  var apiUrl  = 'https://script.google.com/macros/s/' + getParams.api + '/exec';

  // APIコードを読み込む
  $.ajax({
    url:      'https://www.youtube.com/iframe_api',
    dataType: 'script',
    success:  function() {
      // APIコードの読み込み完了時に呼ばれるメソッド
      window.onYouTubeIframeAPIReady = function() {
        // プレイヤーを作成する
        playerYoutube = new YT.Player('youtube-player', {
          height:  '360',
          width:   '640',
          videoId: '51CH3dPaWXc',
          events: {
            'onStateChange': onPlayerStateChange,
          },
        });
      };
    },
  });

  /**
   * getパラメータを取得する
   */
  function getGetParams() {
    var data, params = {}, blocks = location.search.substring(1).split('&');
    for (var i in blocks) {
      data = blocks[i].split('=');
      params[data[0]] = data[1];
    }
    return params;
  }

  /**
   * プレイヤーの状態変化時に呼ばれるメソッド
   */
  function onPlayerStateChange(event) {
    if (!isAgree && event.data == YT.PlayerState.PLAYING) {
      $('#player-status-wait').hide();
      $('#player-status-healthy').show();
      isAgree = true;
      syncPlayer();
      getConnectionCount(true);
    }

    if (event.data == YT.PlayerState.ENDED) {
      if (isLoop) {
        playerYoutube.seekTo(0); // 冒頭にシークする
      } else {
        syncPlayer();
        getConnectionCount(true);
      }

      if (isMute) {
        toUnMute();
      }
    }
  }

  /**
   * サーバと同期する
   */
  function syncPlayer() {
    $('#sync-button').attr('disabled', true);

    $.ajax({
      url:      apiUrl,
      type:     'GET',
      dataType: 'jsonp',
      success: function(response) {
        // 取得したidで、動画を読み込み再生する
        setTimeout(function() {
          playerYoutube.loadVideoById(response.now.rowHash.id, response.offset || 0);

          var tr, td, key, keys = ['past', 'now', 'future'];
          for (var i in keys) {
            key = keys[i];
            tr  = $('#schedule-' + key);
            if ('undefined' !== typeof response[key]) {
              tr.children('.schedule-title').html(response[key].rowHash.title);

              td = tr.children('.schedule-type');
              if (response[key].isRequest) {
                td.html('Request').addClass('mygreen');
              } else {
                td.html('Random').removeClass('mygreen');
              }

              if ('now' === key) {
                document.title = response[key].rowHash.title + ' - syngle';
              }
            } else {
              tr.children('.schedule-title').html('-');
              tr.children('.schedule-type').html('-');
            }
          }
        }, response.gap || 0);
      },
      complete: function() {
        $('#sync-button').attr('disabled', false);
      },
    });
  }

  /**
   * 同時接続数を取得する
   */
  function getConnectionCount(withSave) {
    $.ajax({
      url:      apiUrl,
      type:     'GET',
      dataType: 'jsonp',
      data: {
        api:      'connectionCount',
        withSave: withSave,
      },
      success: function(response) {
        console.log(response.count);
        $('#listener').html(response.count || '?');
      },
    });
  }

  /**
   * 動画のリクエストを送信する
   */
  function requestUrl(isAddOnly) {
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
    $('#request-animate').addClass('spin');
    $('#request-result').html('processing...');

    $.ajax({
      url:      apiUrl,
      type:     'GET',
      dataType: 'jsonp',
      data: {
        api:       'requestUrl',
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
        $('#request-animate').removeClass('spin');
      },
    });
  }

  /**
   * ミュートにする
   */
  function toMute() {
    $('#mute-label').html('On').removeClass().addClass('mygreen');
    playerYoutube.mute();
    isMute = true;
  }

  /**
   * ミュートを解除する
   */
  function toUnMute() {
    $('#mute-label').html('Off').removeClass().addClass('myred');
    playerYoutube.unMute();
    isMute = false;
  }

  /**
   * youtube検索する
   */
  function searchOnYoutube() {
    $('#youtube-search-animate').addClass('spin');

    $.ajax({
      url:      apiUrl,
      type:     'GET',
      dataType: 'jsonp',
      data: {
        api:  'searchYoutube',
        word: $('#youtube-search-word').val(),
      },
      success: function(response) {
        $('#youtube-search-list').children().remove();

        // 結果リストを追加する
        $.each(response.items, function(i, item) {
          var media = $('<div>').addClass('youtube-search-item media');
          var left  = $('<div>').addClass('media-left media-top');
          var body  = $('<div>').addClass('media-body');
          var head  = $('<h4>' ).addClass('media-heading').html(item.snippet.title);

          var img = $('<img>')
            .addClass('youtube-search-img img-rounded')
            .attr('title', item.id.videoId)
            .attr('src', item.snippet.thumbnails.default.url);

          left.append(img);
          body.append(head, $('<span>').html(item.snippet.description));
          media.append(left, body);

          $('#youtube-search-list').append(media, $('<hr>'));
        });

        // 結果リストの画像をクリックしたときのイベントを設定する
        $('.youtube-search-img').click(function() {
          var id = $(this).attr('title');

          // リクエストのテキストボックスに入力する
          $('#request-url').val('http://www.youtube.com/watch?v=' + id);

          // 現在のプレイヤーに割り込み再生する
          playerYoutube.loadVideoById(id);
        });
      },
      complete: function() {
        $('#youtube-search-animate').removeClass('spin');
      },
    });
  }

  /**
   * 大文字英字を小文字英字に変換、ひらがなをカタカナに変換、スペースを除去する
   */
  function toEasyString(str) {
    return str.toLowerCase().replace(/\s+/g, '').replace(/[ァ-ン]/g, function(c) {
      return String.fromCharCode(c.charCodeAt(0) - 0x60);
    });
  }

  // binding -------------------------------------------------------------------
  $(window).load(function() {
    // サブタイトルをつける
    $('#page-sub-title').html(decodeURIComponent(('undefined' !== typeof getParams.title) ? getParams.title : ''));

    // サーバと同期する
    $('#sync-button').click(function() {
      syncPlayer();
      getConnectionCount(false);
    });

    // ループする
    $('#loop-button').click(function() {
      if (isLoop) {
        $('#loop-label').html('Off').removeClass().addClass('myred');
      } else {
        $('#loop-label').html('On').removeClass().addClass('mygreen');
      }
      isLoop = !isLoop;
    });

    // ミュートを切り替える
    $('#mute-button').click(function() {
      (isMute) ? toUnMute() : toMute();
    });

    // 動画の表示/非表示を切り替える
    $('#hide-button').click(function() {
      $('#youtube-player').toggle();
    });

    // 音量を中にする
    $('#volume-middle').click(function() {
      playerYoutube.setVolume(50);
    });

    // 音量を大にする
    $('#volume-max').click(function() {
      playerYoutube.setVolume(100);
    });

    // 動画をリクエストする
    $('#request-button').click(function() {
      requestUrl(false);
    });

    // 動画をマスタに追加する
    $('#add-only-button').click(function() {
      requestUrl(true);
    });

    // youtube検索する
    $('#youtube-search-word').keypress(function(e) {
      if (13 === e.which) {
        // RETURNが押されたとき
        searchOnYoutube();
      }
    });

    // youtube検索する
    $('#youtube-search-exec').click(function() {
      searchOnYoutube();
    });

    // youtube検索結果を消す
    $('#youtube-search-clear').click(function() {
      $('#youtube-search-list').children().remove();
    });

    // マスタを表示する
    $('#get-master').click(function() {
      $('#get-master').attr('disabled', true);
      $('#master-animate').addClass('spin');

      $.ajax({
        url:      apiUrl,
        type:     'GET',
        dataType: 'jsonp',
        data: {
          api: 'master',
        },
        success: function(response) {
          // 前回の内容を消す
          var ul = $('#master ul');
          ul.children().remove();

          // 索引用文字列を生成する
          for (var i in response.master) {
            response.master[i].helpString = toEasyString(response.master[i][response.column.title]);
          }

          // 索引用文字列でソートする
          response.master.sort(function(a, b) {
            return a.helpString.localeCompare(b.helpString);
          });

          // 記号で始まる要素は後方に移動させる
          var notSignIndex = 0, hasNotSign = false;
          for (var i in response.master) {
            notSignIndex = i;
            if (response.master[i].helpString[0].charCodeAt(0) >= 0x41) {
              var notSignArr  = response.master.splice(notSignIndex);
              response.master = notSignArr.concat(response.master);
              break;
            }
          }

          var title, link, help;
          for (var i in response.master) {
            title = $('<span>').html(response.master[i][response.column.title]);
            link  = $('<a>')
              .addClass('glyphicon glyphicon-new-window')
              .attr('href', response.master[i][response.column.url])
              .attr('target', '_blank');
            help = $('<span>')
              .addClass('master-search-help')
              .html(response.master[i].helpString);
            ul.append($('<li>').append(title, link, help));
          }
        },
        complete: function() {
          $('#get-master').attr('disabled', false);
          $('#master-animate').removeClass('spin');
        },
      });
    });

    // マスタのインクリメンタルサーチ
    var masterSearchTimeoutId = null;
    $('#master-search-word').keyup(function() {
      clearTimeout(masterSearchTimeoutId);
      masterSearchTimeoutId = setTimeout(function(word) {
        if ('' === word) {
          $('#master-data-list li').show();
        } else {
          $('#master-data-list li').hide();
          $('#master-data-list li:contains(' + word + ')').show();
        }
      }, 500, $(this).val());
    });

    // 削除動画リストを表示する
    $('#get-deleted').click(function() {
      $('#get-deleted').attr('disabled', true);
      $('#deleted-animate').addClass('spin');

      $.ajax({
        url:      apiUrl,
        type:     'GET',
        dataType: 'jsonp',
        data: {
          api: 'deleted',
        },
        success: function(response) {
          // 前回の内容を消す
          var ul = $('#deleted ul');
          ul.children().remove();

          var title, link;
          for (var i in response.deleted) {
            if ('undefined' === typeof response.deleted[i][response.column.title]) {
              continue;
            }
            title = $('<span>')
              .addClass('deleted-item')
              .html(response.deleted[i][response.column.title]);
            link  = $('<a>')
              .addClass('glyphicon glyphicon-new-window')
              .attr('href', response.deleted[i][response.column.url])
              .attr('target', '_blank');
            ul.append($('<li>').append(title, link));
          }

          // 削除動画リストのタイトルをクリックしたときのイベントを設定する
          $('.deleted-item').click(function() {
            // youtube検索する
            $('#youtube-search-word').val($(this).html());
            searchOnYoutube();

            // youtube検索まで移動する
            $('html, body').animate({scrollTop: $('#youtube-search').offset().top - 40}, 'fast');
          });
        },
        complete: function() {
          $('#get-deleted').attr('disabled', false);
          $('#deleted-animate').removeClass('spin');
        },
      });
    });
  });
})(jQuery);
