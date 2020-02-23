import PlayKeeper from './modules/PlayKeeper.js';

(function($) {
  let player;
  let keeper    = new PlayKeeper();
  let dataTable = null;
  let isAgree   = false; // 明示的に再生ボタンを押したかどうか
  let isLoop    = false; // ループしているかどうか

  // GETパラメータを取得する
  let urlGetParams = (() => {
    let data, params = {}, blocks = location.search.substring(1).split('&');
    for (let i in blocks) {
      data            = blocks[i].split('=');
      params[data[0]] = data[1];
    }
    return params;
  })();

  // 複数のプレイリストを取得する
  $.ajax({
    url: 'https://script.google.com/macros/s/' + urlGetParams.api + '/exec',
    type: 'GET',
    data: {
      plid_csv: urlGetParams.plid_csv,
    },
    dataType: 'jsonp',
    success: response => {
      keeper.setPlaylists(response);
      if (keeper.isPlayable()) {
        updatePlayingInfo(keeper.play());
        enablePlayerControlExtention()
      }

      // datatableを表示する
      $('#merged-playlist-wrap').show();
      dataTable = $('#merged-playlist-table').DataTable({
        data: keeper.getAllVideos().map((video) => {
          // "publishedAt" カラムについて、表示用とソート用の情報を作成する
          video.uniqueKey   = video.id + '-' + video.playlistTitle;
          video.publishedAt = {
            'formatted': (() => {
              // 日付を "yyyy-mm-dd" 形式にする
              let date = new Date(video.publishedAt);

              return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((num) => {
                let str = num.toString();
                if (2 > str.length) {
                  str = '0' + str;
                }
                return str;
              }).join('-');
            })(),
            'raw': video.publishedAt,
          };
          return video;
        }),
        columns: [
          { data: 'id', searchable: false, visible: false },
          { data: { display: 'publishedAt.formatted', sort: 'publishedAt.raw' }, className: 'dt-text-align-center' },
          { data: 'title' },
          { data: 'publisher', className: 'dt-text-align-center' },
          { data: 'playlistTitle', className: 'dt-text-align-center' },
        ],
        rowId: 'uniqueKey',
        language: {
          lengthMenu:   'Show Number _MENU_',
          info:         'Showing _START_ - _END_ / _TOTAL_',
          infoEmpty:    'Showing 0 - 0',
          infoFiltered: ' (total _MAX_)',
          search: '',
          searchPlaceholder: 'Input Video Title',
          paginate: {
            previous: '<',
            next:     '>',
          },
        },
        lengthChange: false,
        order: [[1, 'desc']],
        pageLength: 40,
        processing: true,
      });
    },
  });

  // APIコードを読み込む
  $.ajax({
    url: 'https://www.youtube.com/iframe_api',
    dataType: 'script',
    success: () => {
      // APIコードの読み込み完了時に呼ばれるメソッド
      window.onYouTubeIframeAPIReady = () => {
        // プレイヤーを作成する
        player = new YT.Player('youtube-player', {
          videoId: '51CH3dPaWXc',
          events: {
            'onStateChange': onPlayerStateChange,
            'onError': e => {
              // TODO フラッシュメッセージによる通知
              if (keeper.isPlayable()) {
                updatePlayingInfo(keeper.next());
              }
            }
          },
        });
      };
    },
  });

  /**
   * プレイヤーの状態変化時に呼ばれるメソッド
   *
   * @param object e
   */
  function onPlayerStateChange(e) {
    if (!isAgree && e.data == YT.PlayerState.PLAYING) {
      // 初回再生ボタンを明示的に押したとき
      isAgree = true;

      keeper.setPlayer(player);
      if (keeper.isPlayable()) {
        updatePlayingInfo(keeper.play());
        enablePlayerControlExtention()
      }
    }

    if (e.data == YT.PlayerState.PLAYING) {
      changePlayPauseButtonTo('pause');
    }

    if (e.data == YT.PlayerState.PAUSED) {
      changePlayPauseButtonTo('play')
    }

    if (e.data == YT.PlayerState.ENDED) {
      if (isLoop) {
        player.seekTo(0); // 冒頭にシークする
      } else {
        if (keeper.isPlayable()) {
          updatePlayingInfo(keeper.next());
        }
      }
    }

    // ボリューム変更イベントがないため、状態変化時にスライダーを同期する
    $('#player-volume-box').slider('setValue', player.getVolume());
  }

  /**
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
    $.notify(body, { style: style, autoHide: isAutoClose });
  }

  /**
   * 再生情報を更新する
   *
   * @param object video
   */
  function updatePlayingInfo(video) {
    document.title = video.title + ' - mergle';

    Push.create('mergle', {
      body: video.title,
      icon: './image/cloud_music_ico.png',
      timeout: 6000, // ms
    });

    updatePlayingPositionOnDataTable(video);
  }

  /**
   * データテーブルの再生位置表示を更新する
   *
   * @param object video
   */
  function updatePlayingPositionOnDataTable(video) {
    if (null !== dataTable) {
      dataTable.row('.selected').deselect();
      dataTable.row('#' + video.id + '-' + video.playlistTitle).select().show().draw(false);
    }
  }

  /**
   * 再生停止ボタンの状態を変化させる
   *
   * @param string state 'play' or 'pause'
   */
  function changePlayPauseButtonTo(state) {
    $('#player-play-pause').val(state);

    let playIcon  = $('#player-play-icon');
    let pauseIcon = $('#player-pause-icon');
    if ('play' === state) {
      playIcon.show();
      pauseIcon.hide();
    } else {
      playIcon.hide();
      pauseIcon.show();
    }
  }

  /**
   * 拡張コントロールを有効化させる
   */
  function enablePlayerControlExtention() {
    $('#back-button').attr('disabled', false);
    $('#next-button').attr('disabled', false);
    $('#random-button').attr('disabled', false);
  }

  // binding
  // thisの束縛を回避するため、アロー関数を利用しない
  $(window).on('load', function() {
    // デスクトップ通知の許可を求める
    Push.Permission.request();

    // ツールチップを初期化する
    $('[data-toggle="tooltip"]').tooltip({
      trigger: 'hover',
    });

    // ボリュームスライダーを初期化する
    $('#player-volume-box').slider({
      min:   0,
      max:   100,
      step:  10,
      value: 50,
      tooltip_position: 'bottom',
      formatter: value => value,
    }).change(function() {
      player.setVolume($(this).val());
    });

    // 再生/停止する
    $('#player-play-pause').click(function() {
      if ('play' === $(this).val()) {
        // 再生ボタンであるとき
        player.playVideo();
      } else {
        // 停止ボタンであるとき
        player.pauseVideo();
      }
    });

    // 前へ
    $('#back-button').click(function() {
      if (keeper.isPlayable()) {
        updatePlayingPositionOnDataTable(keeper.back());
      }
    });

    // 次へ
    $('#next-button').click(function() {
      if (keeper.isPlayable()) {
        updatePlayingPositionOnDataTable(keeper.next());
      }
    });

    // ループ切り替え
    $('#loop-button').click(function() {
      isLoop = !isLoop;
      if (isLoop) {
        $('#loop-button').addClass('active');
      } else {
        $('#loop-button').removeClass('active');
      }
    });

    // ランダム切り替え
    $('#random-button').click(function() {
      if (keeper.isPlayable()) {
        if (!keeper.isRandomEnabled()) {
          $('#random-button').addClass('active');
          keeper.toRandom();
        } else {
          $('#random-button').removeClass('active');
          keeper.toUnrandom();
        }
      }
    });

    // 動画の表示/非表示を切り替え
    $('#hide-button').click(function() {
      let frame = $('#player-frame');
      let mask  = $('#player-mask');

      mask.width(frame.width());
      mask.height(frame.height());

      frame.toggle();
      mask.toggle();
    });
  }); // end binding
})(jQuery);
