import PlayKeeper   from './modules/PlayKeeper.js';
import Video        from './modules/Video.js';
import VideoHandler from './modules/VideoHandler.js';

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
    success: function(response) {
      let videoHandler = new VideoHandler();
      let videos       = videoHandler.convertToFlatListFromPlaylists(response);

      keeper.setVideos(videos);
      if (keeper.isPlayable()) {
        updatePlayingInfoWithNotification(keeper.play());
        enablePlayerControlExtention();
      }

      // datatableを表示する
      $('#merged-playlist-wrap').show();
      dataTable = $('#merged-playlist-table').DataTable({
        data: keeper.getUnignoredVideos(),
        columns: [
          { data: { display: 'getFormattedPublishedAt()', sort: 'publishedAt' }, className: 'dt-text-align-center' },
          { data: 'title' },
          { data: 'playlistTitle', className: 'dt-text-align-center' },
        ],
        rowId: 'getUniqueKey()',
        language: {
          lengthMenu: 'Show Number _MENU_',
          info: 'Showing _START_ - _END_ / _TOTAL_',
          infoEmpty: 'Showing 0 - 0',
          infoFiltered: ' (total _MAX_)',
          search: '',
          searchPlaceholder: 'Input Video Title',
          paginate: {
            previous: '<',
            next:     '>',
          },
        },
        lengthChange: false,
        order: [[0, 'desc']],
        pageLength: 20,
        processing: true,
      });

      // ダブルクリックで再生するように、イベントリスナーを追加する
      $('#merged-playlist-table tbody').on('dblclick', 'tr', function() {
        if (keeper.isPlayable()) {
            let clickedVideo = Video.fromObject(dataTable.row(this).data());
            updatePlayingInfo(keeper.playAtDirect(clickedVideo));
        }
      });

      // プレイリスト除外ボタンを配置する
      for (const playlistId in response) {
        let playlist = response[playlistId];

        // ボタン構造
        let html = `
          <div class="btn-group" role="group">
            <button class="btn btn-default" value="${playlistId}">
              ${playlist.title}
            </button>
          </div>`;

        // ボタン構造を作成する
        let div = $(html);

        // ボタンに挙動を定義する
        let button = div.children('button').click(function() {
          if (!$(this).hasClass('active')) {
            $(this).addClass('active');
            keeper.ignoreByPlaylistId($(this).val());
          } else {
            $(this).removeClass('active');
            keeper.unignoreByPlaylistId($(this).val());
          }

          // datatableを再描画する
          dataTable.clear().rows.add(keeper.getUnignoredVideos()).draw();

          // datatableの再生位置を再描画する
          updatePlayingInfo(keeper.getCurrentVideo());
        });

        // ボタン構造を生成する
        $('#playlist-ignore-control').append(div);
      }
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
              let message = '';
              let video   = keeper.getCurrentVideo();
              if (undefined !== video) {
                message = `「${video.title}」で問題が発生しました`;
              } else {
                message = `プレイヤーで問題が発生しました`;
              }

              showFlashMessage(`${message}, 詳細はコンソールをご覧ください`, 'error', false);
              console.log(`${message} code=${e.data} data=${JSON.stringify(e.target.getVideoData())}`);

              if (keeper.isPlayable()) {
                updatePlayingInfoWithNotification(keeper.next());
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
        updatePlayingInfoWithNotification(keeper.play());
        enablePlayerControlExtention();
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
          updatePlayingInfoWithNotification(keeper.next());
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
   * @param string level       レベル, [success, info, warning, error]
   * @param bool   isAutoClose 自動で閉じるかどうか
   */
  function showFlashMessage(body, level, isAutoClose) {
    if (isAutoClose) {
      style += '-auto';
    }
    $.notify(body, { style: level, autoHide: isAutoClose });
  }

  /**
   * 再生情報を更新する
   *
   * @param Video video
   */
  function updatePlayingInfo(video) {
    document.title = video.title + ' - mergle';

    if (null !== dataTable) {
      dataTable.row('.selected').deselect();

      let row = dataTable.row('#' + video.getUniqueKey());
      if (1 === row.length) {
        row.select().show().draw(false);
      }
    }
  }

  /**
   * 再生情報を更新し、デスクトップ通知を出す
   *
   * @param Video video
   */
  function updatePlayingInfoWithNotification(video) {
    updatePlayingInfo(video);

    Push.create('mergle', {
      body: video.title,
      icon: './image/cloud_music_ico.png',
      timeout: 6000, // ms
      silent: true,
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
        updatePlayingInfo(keeper.back());
      }
    });

    // 次へ
    $('#next-button').click(function() {
      if (keeper.isPlayable()) {
        updatePlayingInfo(keeper.next());
      }
    });

    // ループ切り替え
    $('#loop-button').click(function() {
      isLoop = !isLoop;
      if (isLoop) {
        $(this).addClass('active');
      } else {
        $(this).removeClass('active');
      }
    });

    // ランダム切り替え
    $('#random-button').click(function() {
      if (keeper.isPlayable()) {
        if (!keeper.isRandomEnabled()) {
          $(this).addClass('active');
          keeper.toRandom();
        } else {
          $(this).removeClass('active');
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
