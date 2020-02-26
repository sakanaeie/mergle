import Video from './Video.js';

/**
 * 複数プレイリストのマージデータを元に、プレイヤーの操作をおこなう
 */
export default class {
  constructor() {
    this.player = null;

    this.videos           = [];
    this.indexes          = [];
    this.index            = 0;
    this.maxIndex         = 0;
    this.uniqueKeyToIndex = {};

    this.isRandom            = false;
    this.indexesPoolOnRandom = [];
    this.prevIndexesOnRandom = [];
    this.nextIndexesOnRandom = [];

    this.playlistIds        = {};
    this.ignoredPlaylistIds = {};
  }

  // public

  /**
   * 再生可能か
   *
   * @return bool
   */
  isPlayable() {
    return null !== this.player && 0 < this.maxIndex;
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

    this.indexes  = Array.from(this.videos.keys());
    this.index    = 0;
    this.maxIndex = this.indexes.slice(-1)[0];

    this.uniqueKeyToIndex = this.videos.reduce((acc, video, index) => {
      acc[video.getUniqueKey()] = index;
      return acc;
    }, {});

    this.playlistIds = this.videos.reduce((acc, video) => {
      acc[video.playlistId] = video.playlistId;
      return acc;
    }, {});
  }

  /**
   * 動画を全て取得する
   *
   * @return Video[]
   */
  getAllVideos() {
    return this.videos;
  }

  /**
   * 無視されてないプレイリストの動画を取得する
   *
   * @return Video[]
   */
  getUnignoredVideos() {
    return this.videos.filter(video => undefined === this.ignoredPlaylistIds[video.playlistId]);
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
   * @param callable pickIndexFunction index前進/後退の処理
   */
  seek_(pickIndexFunction) {
    let playlistNum = Object.keys(this.playlistIds).length;
    let ignoredNum  = Object.keys(this.ignoredPlaylistIds).length;
    if (0 < ignoredNum && playlistNum === ignoredNum) {
      // 全て無視されているとき
      return;
    }

    pickIndexFunction();

    if (undefined !== this.ignoredPlaylistIds[this.getCurrentVideo().playlistId]) {
      // 無視リストの動画であるとき、再帰する
      this.seek_(pickIndexFunction);
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
        if (this.maxIndex < this.index) {
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
          this.index = this.maxIndex;
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
