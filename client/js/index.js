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
    for (const i in blocks) {
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
        data: keeper.buildVideosForDisplay(),
        columnDefs: [{
          targets: 1,
          defaultContent: `
            <label class="dt-star-toggle">
              <input type="checkbox">
              <i class="fas fa-star stared"></i>
              <i class="far fa-star unstared"></i>
            </label>`,
          searchable: false,
          orderable: false,
        }],
        columns: [
          { data: 'getUniqueKey()', visible: false }, // 検索用
          { data: null, className: 'dt-text-align-center' },
          { data: { display: 'getFormattedPublishedAt()', sort: 'publishedAt' }, className: 'dt-text-align-center' },
          { data: 'title', className: 'dt-click-to-play' },
          { data: 'getFormattedPlaylistTitle()', className: 'dt-text-align-center' },
        ],
        rowId: 'getUniqueKey()',
        language: {
          lengthMenu: 'Show Number _MENU_',
          info: 'Showing _START_ - _END_ / _TOTAL_',
          infoEmpty: 'Showing 0 - 0',
          infoFiltered: ' (total _MAX_)',
          search: '',
          searchPlaceholder: 'Video or Playlist Title',
          paginate: {
            previous: '<',
            next:     '>',
          },
        },
        order: [[2, 'desc']],
        pageLength: 20,
        lengthMenu: [20, 40, 80, 160],
        processing: true,
      });

      // スターのみ表示するボタンを配置する
      let button = $(`
        <button class="btn btn-default btn-sm">
          <i class="fas fa-star"></i>
        </button>
      `);
      button.click(function() {
        if (!$(this).hasClass('active')) {
          $(this).addClass('active');
          let regexpStr = keeper.getStaredVideos().map(video => video.getUniqueKey()).join('|');
          dataTable.column(0).search(regexpStr, true, false).draw();
        } else {
          $(this).removeClass('active');
          dataTable.column(0).search('').draw();
        }
      });
      $('#merged-playlist-wrap input[type="search"]').parent().append(button);

      // スターの付け外しイベントリスナーを追加する
      $('#merged-playlist-table tbody').on('click', '.dt-star-toggle', function() {
        let clickedVideo = dataTable.row($(this).parent()).data();
        if ($(this).children('input').prop('checked')) {
          keeper.starByVideoId(clickedVideo.id);
        } else {
          keeper.unstarByVideoId(clickedVideo.id);
        }
      });

      // タップかダブルクリックで再生するように、イベントリスナーを追加する
      let clickEventName;
      if (-1 !== window.navigator.userAgent.search(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i)) {
        clickEventName = 'click';
      } else {
        clickEventName = 'dblclick';
      }
      $('#merged-playlist-table tbody').on(clickEventName, '.dt-click-to-play', function() {
        if (keeper.isPlayable()) {
            let clickedVideo = dataTable.row(this).data();
            updatePlayingInfo(keeper.playAtDirect(clickedVideo));
        }
      });

      // プレイリスト毎にコントロールを配置する
      for (const playlistId in response) {
        let playlist = response[playlistId];
        let link     = `https://www.youtube.com/playlist?list=${playlistId}`;

        // コントロール構造を作成する
        let div = $(`
          <div class="playlist-filter-unit">
            <label class="playlist-toggle">
              <input type="checkbox" value="${playlistId}" checked="checked">
              <i class="fas fa-check-square checked-box"></i>
              <i class="far fa-square unchecked-box"></i>
              <span class="playlist-title-in-filter">${playlist.title}</span>
              <span class="number-of-videos-in-filter">- ${playlist.items.length} videos</span>
            </label>
            <a href="${link}" target="_blank" rel="noopener noreferrer">
              <i class="fas fa-external-link-alt"></i>
            </a>
          </div>
        `);

        // チェックボックスに挙動を定義する
        let button = div.find('input').change(function() {
          if (!$(this).prop('checked')) {
            keeper.ignoreByPlaylistId($(this).val());
          } else {
            keeper.unignoreByPlaylistId($(this).val());
          }

          // datatableを再描画する
          dataTable.clear().rows.add(keeper.buildVideosForDisplay()).draw();

          // datatableの再生位置を再描画する
          updatePlayingInfo(keeper.getCurrentVideo());

          // datatableのスターを再描画する
          let staredVideos = keeper.getStaredVideos();
          if (0 < staredVideos.length) {
            staredVideos.forEach(staredVideo => {
              $('#' + staredVideo.getUniqueKey() + ' .dt-star-toggle input').prop('checked', true);
            });
          }
        });

        // コントロール構造を生成する
        $('#playlist-filter').append(div);
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
          playerVars: {
            playsinline: 1,
          },
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
        player.seekTo(0); // 先頭にシークする
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
    $('#head-button').prop('disabled', false);
    $('#back-button').prop('disabled', false);
    $('#next-button').prop('disabled', false);
    $('#random-button').prop('disabled', false);
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

    // 先頭へ
    $('#head-button').click(function() {
      if (keeper.isPlayable()) {
        player.seekTo(0); // 先頭にシークする
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
