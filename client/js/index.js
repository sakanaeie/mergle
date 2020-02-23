(function($) {
  /**
   * 複数のプレイリストをマージし、プレイヤーや表示リストの操作をおこなう
   */
  class PlayKeeper {
    constructor() {
      this.videos   = [];
      this.indexes  = [];
      this.index    = 0;
      this.maxIndex = 0;

      this.isRandom        = false;
      this.prevsOnRandom   = [];
      this.nextsOnRandom   = [];
      this.indexesOnRandom = [];
    }

    // public

    /**
     * プレイリストをセットする
     *
     * @param object playlists AppsScriptAPIのレスポンス
     */
    setPlaylists(playlists) {
      for (const key in playlists) {
        let playlist = playlists[key];

        this.videos = this.videos.concat(playlist.items.map(item => {
          item['playlistTitle']        = playlist.title;
          item['formattedPublishedAt'] = (() => {
            // 日付を "yyyy-mm-dd" 形式にする
            let date = new Date(item.publishedAt);

            return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((num) => {
              let str = num.toString();
              if (2 > str.length) {
                str = '0' + str;
              }
              return str;
            }).join('-');
          })();

          return item;
        }));
      };

      this.videos.sort((a, b) => {
        return a.publishedAt < b.publishedAt;
      });

      this.indexes  = Array.from(this.videos.keys());
      this.maxIndex = this.indexes.slice(-1)[0];
    };

    /**
     * プレイリストがセットされているか
     *
     * @return bool
     */
    existsPlaylists() {
      return 0 < this.maxIndex;
    };

    /**
     * 動画を全て取得する
     */
    getAllVideos() {
      return this.videos;
    };

    /**
     * 再生する
     */
    play() {
      let video = this.getCurrentVideo_();

      // ページタイトルを更新し、通知を表示する
      document.title = video.title + ' - mergle';
      showDesktopNotification(video.title);

      player.loadVideoById(video.id);
    };

    /**
     * 次へ
     */
    next() {
      this.forwardIndex_().play();
    };

    // private

    /**
     * プレイリスト位置の動画を取得する
     *
     * @return object
     */
    getCurrentVideo_() {
      return this.videos[this.index];
    };

    /**
     * プレイリスト位置を進める
     *
     * @return this
     */
    forwardIndex_() {
      this.index++;

      if (this.maxIndex < this.index) {
        this.index = 0;
      }

      return this;
    };
  }

  // GETパラメータを取得する
  let urlGetParams = (() => {
    let data, params = {}, blocks = location.search.substring(1).split('&');
    for (let i in blocks) {
      data            = blocks[i].split('=');
      params[data[0]] = data[1];
    }
    return params;
  })();

  let player;
  let keeper  = new PlayKeeper();
  let isAgree = false; // 明示的に再生ボタンを押したかどうか
  let isLoop  = false; // ループしているかどうか
  let apiUrl  = 'https://script.google.com/macros/s/' + urlGetParams.api + '/exec';

  // 複数のプレイリストを取得する
  $.ajax({
    url: apiUrl,
    type: 'GET',
    data: {
      plid_csv: urlGetParams.plid_csv,
    },
    dataType: 'jsonp',
    success: response => {
      keeper.setPlaylists(response);

      if (isAgree) {
        // 既にプレイヤーがアクティブなら、再生を開始する
        keeper.play();
      }

      // datatablesを表示する
      $('#merged-playlist-wrap').show();
      let masterDataTable = $('#merged-playlist-table').dataTable({
        data: keeper.getAllVideos(),
        columns: [
          { data: 'id', searchable: false, visible: false },
          { data: 'formattedPublishedAt', searchable: false, className: 'dt-text-align-center' },
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
              // TODO 通知など
              if (keeper.existsPlaylists()) {
                keeper.next();
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
      if (keeper.existsPlaylists()) {
        // 既にプレイリストがセットされているなら、再生を開始する
        keeper.play();
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
        if (keeper.existsPlaylists()) {
          keeper.next();
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
   * デスクトップ通知を表示する
   *
   * @param string body 本文
   */
  function showDesktopNotification(body) {
    notify.createNotification('syngle', {
      body: body,
      icon: './image/cloud_music_ico.png',
      tag: 'syngle',
    });
  }

  /**
   * 再生停止ボタンの状態を変化させる
   *
   * @param string state 状態遷移先
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
  // thisの束縛を回避するため、アロー関数を利用してないところもある
  $(window).load(function() {
    // デスクトップ通知の許可を求める
    notify.config({ autoClose: 8000 });
    if (notify.isSupported) {
      if (notify.PERMISSION_DEFAULT === notify.permissionLevel()) {
        notify.requestPermission();
      }
    }

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
