import Video from './Video.js';

/**
 * 複数プレイリストのマージデータを元に、プレイヤーの操作をおこなう
 */
export default class {
  constructor() {
    this.player = null;

    // 再生情報
    this.videos           = [];
    this.indexes          = [];
    this.index            = 0;
    this.lastIndex        = 0;
    this.videoIdToVideos  = {};
    this.uniqueKeyToIndex = {};

    // 表示用動画情報
    this.videosForDisplay = {};

    // プレイリスト
    this.playlistIds        = {};
    this.playlistIdToVideos = {};

    // ランダム
    this.isRandom            = false;
    this.indexesPoolOnRandom = [];
    this.prevIndexesOnRandom = [];
    this.nextIndexesOnRandom = [];

    // プレイリスト無視
    this.ignoredPlaylistIds = {};

    // スター
    this.staredVideoIds = {};
  }

  // public

  /**
   * 再生可能か
   *
   * @return bool
   */
  isPlayable() {
    return null !== this.player && 0 < this.lastIndex;
  };

  /**
   * プレイヤーをセットする
   *
   * @param object player YT.player
   */
  setPlayer(player) {
    this.player = player;
  }

  /**
   * 動画リストをセットする
   *
   * @param Video[] videos
   */
  setVideos(videos) {
    this.videos = videos;
    this.videos.sort((a, b) => a.publishedAt < b.publishedAt ? 1 : -1);

    this.indexes   = Array.from(this.videos.keys());
    this.index     = 0;
    this.lastIndex = this.indexes.slice(-1)[0];

    this.videos.forEach((video, index) => {
      if (!(this.videoIdToVideos[video.id] instanceof Array)) {
        this.videoIdToVideos[video.id] = [];
      }
      this.videoIdToVideos[video.id].push(video);

      this.uniqueKeyToIndex[video.getUniqueKey()] = index;

      if (!(this.playlistIdToVideos[video.playlistId] instanceof Array)) {
        this.playlistIdToVideos[video.playlistId] = [];
      }
      this.playlistIdToVideos[video.playlistId].push(video);
    });

    this.playlistIds = Object.keys(this.playlistIdToVideos);
  }

  /**
   * 表示用動画情報を作成する
   *
   * @return Video[]
   */
  buildVideosForDisplay() {
    this.videosForDisplay = this.videos.reduce((acc, video) => {
      video.removeDuplicatedPlaylistTitles();
      if (!video.isIgnored) {
        // 無視リストの動画ではないとき
        if (undefined === acc[video.id]) {
          acc[video.id] = video;
        } else {
          // 重複のとき、若い方にプレイリストタイトルを渡す
          acc[video.id].pushDuplicatedPlaylistTitle(video.playlistTitle);
        }
      }
      return acc;
    }, {});

    return Object.values(this.videosForDisplay);
  }

  /**
   * スター付き動画を取得する
   *
   * @return Video[]
   */
  getStaredVideos() {
    return Object.keys(this.staredVideoIds).reduce((acc, staredVideoId) => {
      acc = acc.concat(this.videoIdToVideos[staredVideoId]);
      return acc;
    }, []);
  }

  /**
   * 再生位置の動画を取得する
   *
   * @return Video
   */
  getCurrentVideo() {
    return this.videos[this.index];
  }

  /**
   * ランダムか
   *
   * @return bool
   */
  isRandomEnabled() {
    return this.isRandom;
  }

  /**
   * ランダムにする
   */
  toRandom() {
    this.isRandom            = true;
    this.indexesPoolOnRandom = Array.from(this.indexes);
    this.prevIndexesOnRandom = [];
    this.nextIndexesOnRandom = [];
  }

  /**
   * 非ランダムにする
   */
  toUnrandom() {
    this.isRandom            = false;
    this.indexesPoolOnRandom = [];
    this.prevIndexesOnRandom = [];
    this.nextIndexesOnRandom = [];
  }

  /**
   * プレイリストの無視を設定する
   *
   * @param string playlistId
   */
  ignoreByPlaylistId(playlistId) {
    if (this.isRandom) {
      this.toRandom(); // 初期化
    }

    this.ignoredPlaylistIds[playlistId] = playlistId;

    this.playlistIdToVideos[playlistId].map(video => {
      video.isIgnored = true;
    });
  }

  /**
   * プレイリストの無視を解除する
   *
   * @param string playlistId
   */
  unignoreByPlaylistId(playlistId) {
    if (this.isRandom) {
      this.toRandom(); // 初期化
    }

    delete this.ignoredPlaylistIds[playlistId];

    this.playlistIdToVideos[playlistId].map(video => {
      video.isIgnored = false;
    });
  }

  /**
   * スターで再生するべきか
   *
   * @return bool
   */
  shouldPlayByStar() {
    for (const staredVideoId in this.staredVideoIds) {
      // スター付き動画のいずれかひとつでも
      for (const i in this.videoIdToVideos[staredVideoId]) {
        // 重複動画のいずれかひとつでも
        if (!this.videoIdToVideos[staredVideoId][i].isIgnored) {
          // 無視リストの動画でないとき
          return true;
        }
      }
    }

    return false;
  }

  /**
   * スターを付ける
   *
   * @param string videoId
   */
  starByVideoId(videoId) {
    if (this.isRandom) {
      this.toRandom(); // 初期化
    }

    this.staredVideoIds[videoId] = videoId;
    this.videoIdToVideos[videoId].map(video => {
      video.isStared = true;
    });
  }

  /**
   * スターを外す
   *
   * @param string videoId
   */
  unstarByVideoId(videoId) {
    if (this.isRandom) {
      this.toRandom(); // 初期化
    }

    delete this.staredVideoIds[videoId];
    this.videoIdToVideos[videoId].map(video => {
      video.isStared = false;
    });
  }

  /**
   * スターを上書きする
   *
   * @param string[] videoIds
   */
  overwriteStarByVideoIds(videoIds) {
    if (this.isRandom) {
      this.toRandom(); // 初期化
    }

    this.staredVideoIds = {};
    this.videos.map(video => {
      let videoId = video.id;
      if (videoIds.includes(videoId)) {
        this.staredVideoIds[videoId] = videoId;
        this.videoIdToVideos[videoId].map(video => {
          video.isStared = true;
        });
      } else {
        video.isStared = false;
      }
    });

    if (null === this.player) {
      // 再生されてないとき、最初のスター付き動画までシークする
      this.backwardIndex_(); // 先に後退させる
      this.forwardIndex_();
    }
  }

  /**
   * 再生する
   *
   * @return Video video
   */
  play() {
    let video = this.getCurrentVideo();
    this.player.loadVideoById(video.id);

    return video;
  }

  /**
   * 動画を指定して再生する
   *
   * @param Video video
   * @return Video
   */
  playAtDirect(video) {
    if (this.isRandom) {
      this.toRandom(); // 初期化
    }

    let hitIndex = this.uniqueKeyToIndex[video.getUniqueKey()];
    if (undefined !== hitIndex) {
      this.index = hitIndex;
    }

    return this.play();
  }

  /**
   * 次へ
   *
   * @return Video
   */
  next() {
    return this.forwardIndex_().play();
  }

  /**
   * 前へ
   *
   * @return Video
   */
  back() {
    return this.backwardIndex_().play();
  }

  // private

  /**
   * 再生位置を移動させる
   *
   * 再起させると stack size exceeded になるため、素直な while に設計を変更した
   *
   * @param callable pickIndexFunction index前進/後退の処理
   */
  seek_(pickIndexFunction) {
    let playlistNum = Object.keys(this.playlistIds).length;
    let ignoredNum  = Object.keys(this.ignoredPlaylistIds).length;
    if (0 < ignoredNum && playlistNum === ignoredNum) {
      // 全て無視されているとき
      return;
    }

    let loop = 0; // 念の為の無限ループ対策
    while (100000 > loop++) {
      pickIndexFunction();

      let currentVideo = this.getCurrentVideo();
      if (this.shouldPlayByStar() && !currentVideo.isStared) {
        // スターで再生するべきだが、この動画には付いてないとき
        continue;
      }

      if (currentVideo.isIgnored) {
        // 無視リストの動画であるとき
        continue;
      }

      let sameVideoForDisplay = this.videosForDisplay[currentVideo.id];
      if (currentVideo.getUniqueKey() !== sameVideoForDisplay.getUniqueKey()) {
        // 表示用動画情報にある同動画が、この動画とは別の個体であるとき
        continue;
      }

      break;
    }
  }

  /**
   * 再生位置を前進させる
   *
   * @return this
   */
  forwardIndex_() {
    this.seek_(() => {
      if (!this.isRandom) {
        this.index++;
        if (this.lastIndex < this.index) {
          this.index = 0;
        }
      } else {
        this.prevIndexesOnRandom.push(this.index);

        if (0 < this.nextIndexesOnRandom.length) {
          this.index = this.nextIndexesOnRandom.pop();
        } else {
          this.pickAtRandom_();
        }
      }
    });

    return this;
  }

  /**
   * 再生位置を後退させる
   *
   * @return this
   */
  backwardIndex_() {
    this.seek_(() => {
      if (!this.isRandom) {
        this.index--;
        if (0 > this.index) {
          this.index = this.lastIndex;
        }
      } else {
        this.nextIndexesOnRandom.push(this.index);

        if (0 < this.prevIndexesOnRandom.length) {
          this.index = this.prevIndexesOnRandom.pop();
        } else {
          this.pickAtRandom_();
        }
      }
    });

    return this;
  }

  /**
   * ランダムにピックする
   */
  pickAtRandom_() {
    let numOfPool = this.indexesPoolOnRandom.length;
    if (0 === numOfPool) {
      this.toRandom(); // 初期化
    }
    this.index = this.indexesPoolOnRandom.splice(Math.floor(Math.random() * numOfPool), 1).pop();
  }
}
