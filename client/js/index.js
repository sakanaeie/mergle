(function($) {
  // プレイヤー
  var playerYoutube;

  // getパラメータ
  var getParams = getGetParams();

  // 各種URL
  var apiUrl          = 'https://script.google.com/macros/s/' + getParams.api + '/exec';
  var youtubeVideoUrl = 'https://www.youtube.com/watch?v=';

  // 再生中動画のマスタ情報
  var nowInfo = null;

  // 明示的に再生ボタンを押したかどうか
  var isAgree = false;

  // ループ、ミュートしているかどうか
  var isLoop = isMute = false;

  // youtube検索のパラメータ
  var youtubeSearchWord  = '';
  var youtubeSearchIndex = 1;

  // APIコードを読み込む -------------------------------------------------------
  $.ajax({
    url:      'https://www.youtube.com/iframe_api',
    dataType: 'script',
    success:  function() {
      // APIコードの読み込み完了時に呼ばれるメソッド
      window.onYouTubeIframeAPIReady = function() {
        // プレイヤーを作成する
        playerYoutube = new YT.Player('youtube-player', {
          videoId: '51CH3dPaWXc',
          events:  {
            'onStateChange': onPlayerStateChange,
          },
        });
      };
    },
  });

  /** --------------------------------------------------------------------------
   * getパラメータを取得する
   *
   * @return object params getパラメータ
   */
  function getGetParams() {
    var data, params = {}, blocks = location.search.substring(1).split('&');
    for (var i in blocks) {
      data            = blocks[i].split('=');
      params[data[0]] = data[1];
    }
    return params;
  }

  /** --------------------------------------------------------------------------
   * 0埋めする
   *
   * @param mixed val   数字
   * @param int   width 幅
   */
  function zerofill(val, width) {
    val = val.toString();
    while (val.length < width) {
      val = '0' + val;
    }
    return val;
  }

  /** --------------------------------------------------------------------------
   * フラッシュメッセージを表示する
   *
   * @param string body        本文
   * @param string style       スタイル
   * @param bool   isAutoClose 自動で閉じるかどうか
   */
  function showFlashMessage(body, style, isAutoClose) {
    if (isAutoClose) {
      style += '-auto';
    }
    $.notify(body, {style: style, autoHide: isAutoClose});
  }

  /** --------------------------------------------------------------------------
   * デスクトップ通知を表示する
   *
   * @param string body 本文
   */
  function showDesktopNotification(body) {
    notify.createNotification('syngle', {
      body: body,
      icon: './image/cloud_music_ico.png',
      tag:  'syngle',
    });
  }

  /** --------------------------------------------------------------------------
   * プレイヤーの状態変化時に呼ばれるメソッド
   *
   * @param object event
   */
  function onPlayerStateChange(event) {
    if (!isAgree && event.data == YT.PlayerState.PLAYING) {
      // 初回再生ボタンを明示的に押したとき
      isAgree = true;
      syncPlayer();
      getConnectionCount(true);
    }

    if (event.data == YT.PlayerState.PLAYING) {
      changePlayPauseButtonTo('pause');
    }

    if (event.data == YT.PlayerState.PAUSED) {
      changePlayPauseButtonTo('play')
    }

    if (event.data == YT.PlayerState.ENDED) {
      if (isMute) {
        toUnMute();
      }

      if (isLoop) {
        playerYoutube.seekTo(0); // 冒頭にシークする
      } else {
        setTimeout(function() {
          syncPlayer();
          getConnectionCount(true);
        }, 1000); // 動画が早く終わることへの対応
      }
    }

    // ボリューム変更イベントがないため、状態変化時にスライダーを同期する
    $('#player-volume-box').slider('setValue', playerYoutube.getVolume());
  }

  /** --------------------------------------------------------------------------
   * サーバと同期する
   */
  function syncPlayer() {
    $('#sync-button').attr('disabled', true);
    $('#good-button').attr('disabled', true);
    $('#bad-button').attr('disabled', true);

    $.ajax({
      url:      apiUrl,
      type:     'GET',
      dataType: 'jsonp',
      success:  function(response) {
        // 取得したidで、動画を読み込み再生する
        setTimeout(function() {
          playerYoutube.loadVideoById(response.now.rowHash.id, response.offset || 0);

          // スケジュール表示を更新する
          var videoInfo, startDate, tr, td, key, keys = ['past', 'now', 'future'];
          for (var i in keys) {
            key = keys[i];
            tr  = $('#schedule-' + key);
            if ('undefined' !== typeof response[key]) {
              videoInfo = response[key];
              startDate = new Date(videoInfo.startAt * 1000);

              tr.children('.schedule-time').html(
                zerofill(startDate.getHours(), 2)
                + ':' + zerofill(startDate.getMinutes(), 2)
                + ':' + zerofill(startDate.getSeconds(), 2)
              );
              tr.children('.schedule-title').html(videoInfo.rowHash.title);
              tr.children('.schedule-rating').html(
                response.rating[key].good + ' / ' + response.rating[key].bad * -1
              );

              // 選曲種別で色付けする
              td = tr.children('.schedule-type').removeClass('myblue myorange myviolet');
              switch (videoInfo.chooseType) {
                case Schedule.CHOOSE_TYPE_RANDOM:
                  td.html('');
                  break;
                case Schedule.CHOOSE_TYPE_REQUEST:
                  td.html('Request').addClass('myblue');
                  break;
                case Schedule.CHOOSE_TYPE_PICKUP:
                  td.html('Pickup').addClass('myorange');
                  break;
                case Schedule.CHOOSE_TYPE_JOCKEY:
                  td.html('DJ ' + videoInfo.jockeyInfo.name).addClass('myviolet');
                  break;
              }

              if ('now' === key) {
                // 現在の動画であるとき、ページタイトルを変更し、デスクトップ通知を表示する
                nowInfo        = videoInfo.rowHash;
                document.title = nowInfo.title + ' - syngle';
                showDesktopNotification(nowInfo.title);
              }
            } else {
              tr.children('.schedule-time').html('');
              tr.children('.schedule-title').html('');
              tr.children('.schedule-rating').html('');
              tr.children('.schedule-type').html('');
            }
          }
        }, (response.gap || 0) * 1000);
      },
      complete: function() {
        $('#sync-button').attr('disabled', false);
        $('#good-button').attr('disabled', false);
        $('#bad-button').attr('disabled', false);
      },
    });
  }

  /** --------------------------------------------------------------------------
   * 再生停止ボタンの状態を変化させる
   *
   * @param string state 状態遷移先
   */
  function changePlayPauseButtonTo(state) {
    $('#player-play-pause').val(state);

    var playIcon  = $('#player-play-icon');
    var pauseIcon = $('#player-pause-icon');
    if ('play' === state) {
      playIcon.show();
      pauseIcon.hide();
    } else {
      playIcon.hide();
      pauseIcon.show();
    }
  }

  /** --------------------------------------------------------------------------
   * 同時接続数を取得する
   *
   * @param bool withSave 記録も同時に行なうかどうか
   */
  function getConnectionCount(withSave) {
    $.ajax({
      url:      apiUrl,
      type:     'GET',
      dataType: 'jsonp',
      data:     {
        api:      'connectionCount',
        withSave: withSave,
      },
      success:  function(response) {
        $('#player-viewer-count').html(response.count || '0');
      },
    });
  }

  /** --------------------------------------------------------------------------
   * 動画のリクエストを送信する
   *
   * @param bool isAddOnly マスタ追加のみかどうか
   */
  function requestUrl(isAddOnly) {
    isAddOnly = isAddOnly || false;

    // 入力を取得する
    var url = $('#request-url').val();
    if ('' === url) {
      return; // 入力がなければ無言で終了
    }

    // ボタンを押せなくする
    $('#request-button').attr( 'disabled', true);
    $('#add-only-button').attr('disabled', true);

    // くるくるを出す
    $('#request-animate').addClass('spin');

    $.ajax({
      url:      apiUrl,
      type:     'GET',
      dataType: 'jsonp',
      data:     {
        api:       'requestUrl',
        url:       url,
        isAddOnly: isAddOnly,
      },
      success:  function(response) {
        // レスポンスのメッセージを表示させる
        showFlashMessage(response.message + ' (' + url + ')', response.result, false);
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

  /** --------------------------------------------------------------------------
   * ミュートにする
   */
  function toMute() {
    $('#mute-button').addClass('active');
    playerYoutube.mute();
    isMute = true;
  }

  /** --------------------------------------------------------------------------
   * ミュートを解除する
   */
  function toUnMute() {
    $('#mute-button').removeClass('active');
    playerYoutube.unMute();
    isMute = false;
  }

  /** --------------------------------------------------------------------------
   * youtube検索する
   *
   * @param string token ページング用トークン
   */
  function searchOnYoutube(token) {
    // ページャボタンを押せなくする
    $('#youtube-search-prev').attr('disabled', true);
    $('#youtube-search-next').attr('disabled', true);

    // くるくるを出す
    $('#youtube-search-animate').addClass('spin');

    if ('undefined' === typeof token) {
      // ページング用トークンがないとき
      youtubeSearchWord  = $('#youtube-search-word').val();
      youtubeSearchIndex = 1;
    }
    $('#youtube-search-page').html(youtubeSearchIndex);

    $.ajax({
      url:      apiUrl,
      type:     'GET',
      dataType: 'jsonp',
      data:     {
        api:   'searchYoutube',
        word:  youtubeSearchWord,
        token: token,
      },
      success:  function(response) {
        // 結果リストを消す
        $('#youtube-search-list').children().remove();

        // ページャボタンを更新する
        if ('undefined' !== typeof response.prevPageToken) {
          $('#youtube-search-prev').attr('disabled', false).val(response.prevPageToken);
        }
        if ('undefined' !== typeof response.nextPageToken) {
          $('#youtube-search-next').attr('disabled', false).val(response.nextPageToken);
        }

        // 結果リストを追加する
        $.each(response.items, function(i, item) {
          var media = $('#youtube-search-list-template > div').clone();

          media.find('.youtube-search-channel')
            .html(item.snippet.channelTitle);
          media.find('.youtube-search-title')
            .html(item.snippet.title)
            .attr('data-video-id', item.id.videoId)
            .attr('data-video-title', item.snippet.title);
          media.find('img')
            .addClass('youtube-search-img')
            .attr('src', item.snippet.thumbnails.default.url)
            .attr('data-video-id', item.id.videoId)
            .attr('data-video-title', item.snippet.title);

          $('#youtube-search-list').append(media);
        });

        // 結果リストの画像かタイトルをクリックしたときのイベントを設定する
        $('.youtube-search-title, .youtube-search-img').click(function() {
          var id    = $(this).attr('data-video-id');
          var title = $(this).attr('data-video-title');

          showFlashMessage('"' + title + '" の割り込み再生を開始し、リクエスト欄にURLを入力しました。', 'info', true);

          // リクエストのテキストボックスに入力する
          $('#request-url').val(youtubeVideoUrl + id);

          // 現在のプレイヤーに割り込み再生する
          playerYoutube.loadVideoById(id);
        });

        // チャンネル名をクリックしたときのイベントを設定する
        $('.youtube-search-channel').click(function() {
          var channel = $(this).html();

          showFlashMessage('"' + channel + '" で検索しました。', 'info', true);

          // チャンネル名で検索する
          $('#youtube-search-word').val(channel);
          searchOnYoutube();
        });
      },
      complete: function() {
        $('#youtube-search-animate').removeClass('spin');
      },
    });
  }

  /** --------------------------------------------------------------------------
   * 評価する
   *
   * @param string type 評価種別
   */
  function execRating(type) {
    $.ajax({
      url:      apiUrl,
      type:     'GET',
      dataType: 'jsonp',
      data:     {
        api:      'rating',
        id:       nowInfo.id,
        provider: nowInfo.provider,
        type:     type,
      },
      success:  function(response) {
        if (true === response.result) {
          showFlashMessage('"' + nowInfo.title + '" に ' + type + ' 評価しました。', 'success', true);
        } else {
          showFlashMessage('"' + nowInfo.title + '" の評価に失敗しました。', 'error', true);
        }
      },
    });
  }

  // binding -------------------------------------------------------------------
  $(window).load(function() {
    // デスクトップ通知の許可を求める ------------------------------------------
    notify.config({autoClose: 8000});
    if (notify.isSupported) {
      if (notify.PERMISSION_DEFAULT === notify.permissionLevel()) {
        notify.requestPermission();
      }
    }

    // マスタを取得する --------------------------------------------------------
    $('#master-data-list').dataTable({
      ajax: {
        url:      apiUrl,
        type:     'GET',
        dataType: 'jsonp',
        data:     {
          api: 'master',
        },
        dataSrc:  function(response) {
          // 登録日で降順ソートする
          // - 年月日までしか表示してないため、内部的に時分秒を含めソートしておくことで、順番の一貫性を保つ
          response.master.sort(function(a, b) {
            var i      = response.column.createdAt;
            var fixedA = ('' === a[i]) ? 0 : a[i];
            var fixedB = ('' === b[i]) ? 0 : b[i];
            return fixedB - fixedA;
          })

          var row, createdDate, createdAt, jsons = [];
          for (var i in response.master) {
            row = response.master[i];

            if ('' !== row[response.column.createdAt]) {
              createdDate = new Date(row[response.column.createdAt] * 1000);
              createdAt   = createdDate.getFullYear()
                + '-' + zerofill(createdDate.getMonth() + 1, 2)
                + '-' + zerofill(createdDate.getDate(), 2);
            } else {
              createdAt = '';
            }

            jsons.push({
              createdAt: createdAt,
              title:     row[response.column.title],
              good:      row[response.column.good],
              bad:       row[response.column.bad],
            });
          }
          return jsons;
        },
      },
      columns: [
        {data: 'createdAt', searchable: false},
        {data: 'title'},
        {data: 'good', searchable: false},
        {data: 'bad', searchable: false},
      ],
      language: {
        lengthMenu:        'Show Number _MENU_',
        info:              'Showing _START_ - _END_ / _TOTAL_',
        infoEmpty:         'Showing 0 - 0',
        infoFiltered:      ' (total _MAX_)',
        search:            '',
        searchPlaceholder: 'Input Video Title',
        paginate:          {
          previous: '<',
          next:     '>',
        },
      },
      lengthChange: false,
      order: [[0, 'desc']],
      pageLength: 50,
      scrollY: '500px',
    });

    // サブタイトルをつける ----------------------------------------------------
    $('#page-sub-title').html(decodeURIComponent(('undefined' !== typeof getParams.title) ? getParams.title : ''));

    // 再生/停止する -----------------------------------------------------------
    $('#player-play-pause').click(function() {
      if ('play' === $(this).val()) {
        // 再生ボタンであるとき
        playerYoutube.playVideo();
      } else {
        // 停止ボタンであるとき
        playerYoutube.pauseVideo();
      }
    });

    // ボリュームスライダーを初期化する ----------------------------------------
    $('#player-volume-box').slider({
      min:              0,
      max:              100,
      step:             10,
      value:            50,
      tooltip_position: 'bottom',
      formatter:        function(value) {
        return value;
      },
    }).change(function() {
      playerYoutube.setVolume($(this).val());
    });

    // ツールチップを初期化する ------------------------------------------------
    $('[data-toggle="tooltip"]').tooltip({
      trigger: 'hover',
    });

    // サーバと同期する --------------------------------------------------------
    $('#sync-button').click(function() {
      syncPlayer();
      getConnectionCount(false);
    });

    // ループする --------------------------------------------------------------
    $('#loop-button').click(function() {
      isLoop = !isLoop;
      if (isLoop) {
        $('#loop-button').addClass('active');
      } else {
        $('#loop-button').removeClass('active');
      }
    });

    // ミュートを切り替える ----------------------------------------------------
    $('#mute-button').click(function() {
      (isMute) ? toUnMute() : toMute();
    });

    // 動画の表示/非表示を切り替える -------------------------------------------
    $('#hide-button').click(function() {
      var player = $('#player-frame');
      var mask   = $('#player-mask');

      mask.width(player.width());
      mask.height(player.height());

      player.toggle();
      mask.toggle();
    });

    // いいね ------------------------------------------------------------------
    $('#good-button').click(function() {
      $(this).attr('disabled', true);
      execRating('good');
    });

    // わるいね ----------------------------------------------------------------
    $('#bad-button').click(function() {
      $(this).attr('disabled', true);
      execRating('bad');
    });

    // 動画をリクエストする ----------------------------------------------------
    $('#request-button').click(function() {
      requestUrl(false);
    });

    // 動画をマスタに追加する --------------------------------------------------
    $('#add-only-button').click(function() {
      requestUrl(true);
    });

    // youtube検索する ---------------------------------------------------------
    $('#youtube-search-word').keypress(function(e) {
      if (13 === e.which) {
        // RETURNが押されたとき
        searchOnYoutube();
      }
    });

    // youtube検索する ---------------------------------------------------------
    $('#youtube-search-exec').click(function() {
      searchOnYoutube();
    });

    // youtube検索のページャを戻す ---------------------------------------------
    $('#youtube-search-prev').click(function() {
      youtubeSearchIndex--;
      searchOnYoutube($(this).val());
    });

    // youtube検索のページャを進める -------------------------------------------
    $('#youtube-search-next').click(function() {
      youtubeSearchIndex++;
      searchOnYoutube($(this).val());
    });

    // youtube検索結果を消す ---------------------------------------------------
    $('#youtube-search-clear').click(function() {
      $('#youtube-search-word').val('');
      $('#youtube-search-list').children().remove();
    });
  }); // end binding
})(jQuery);
