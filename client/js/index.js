import PlayKeeper from './modules/PlayKeeper.js';

(function($) {
  let player;
  let keeper  = new PlayKeeper();
  let isAgree = false; // 明示的に再生ボタンを押したかどうか
  let isLoop  = false; // ループしているかどうか

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
        notifyPlayStatus(keeper.play());
      }

      // datatableを表示する
      $('#merged-playlist-wrap').show();
      let masterDataTable = $('#merged-playlist-table').dataTable({
        data: keeper.getAllVideos().map((video) => {
          // "publishedAt" カラムについて、表示用とソート用の情報を作成する
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
          { data: { display: 'publishedAt.formatted', sort: 'publishedAt.raw' }, searchable: false, className: 'dt-text-align-center' },
          { data: 'title' },
          { data: 'publisher', searchable: false, className: 'dt-text-align-center' },
          { data: 'playlistTitle', searchable: false, className: 'dt-text-align-center' },
        ],
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
                notifyPlayStatus(keeper.next());
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
        notifyPlayStatus(keeper.play());
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
          notifyPlayStatus(keeper.next());
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
   * 再生情報を通知する
   *
   * @param object video
   */
  function notifyPlayStatus(video) {
    document.title = video.title + ' - mergle';
    Push.create('mergle', {
      body: video.title,
      icon: './image/cloud_music_ico.png',
      timeout: 6000, // ms
    });
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

  // binding
  // thisの束縛を回避するため、アロー関数を利用しない
  $(window).load(function() {
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
      keeper.back(); // 通知はしない
    });

    // 次へ
    $('#next-button').click(function() {
      keeper.next(); // 通知はしない
    });

    // ループする
    $('#loop-button').click(function() {
      isLoop = !isLoop;
      if (isLoop) {
        $('#loop-button').addClass('active');
      } else {
        $('#loop-button').removeClass('active');
      }
    });

    // 動画の表示/非表示を切り替える
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
