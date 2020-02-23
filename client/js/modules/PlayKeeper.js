/**
 * 複数のプレイリストをマージし、プレイヤーや表示リストの操作をおこなう
 */
export default class {
  constructor() {
    this.player = null;

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
   * プレイリストをセットする
   *
   * @param object playlists AppsScriptAPIのレスポンス
   */
  setPlaylists(playlists) {
    for (const key in playlists) {
      let playlist = playlists[key];

      this.videos = this.videos.concat(playlist.items.map(item => {
        item['playlistTitle'] = playlist.title;
        return item;
      }));
    };

    this.videos.sort((a, b) => a.publishedAt < b.publishedAt ? 1 : -1);

    this.indexes  = Array.from(this.videos.keys());
    this.maxIndex = this.indexes.slice(-1)[0];
  }

  /**
   * 動画を全て取得する
   *
   * @return object[]
   */
  getAllVideos() {
    return this.videos;
  }

  /**
   * 再生する
   *
   * @return object video
   */
  play() {
    let video = this.getCurrentVideo_();
    this.player.loadVideoById(video.id);

    return video;
  }

  /**
   * 次へ
   *
   * @return object video
   */
  next() {
    return this.forwardIndex_().play();
  }

  /**
   * 前へ
   *
   * @return object video
   */
  back() {
    return this.backwardIndex_().play();
  }

  // private

  /**
   * プレイリスト位置の動画を取得する
   *
   * @return object
   */
  getCurrentVideo_() {
    return this.videos[this.index];
  }

  /**
   * プレイリスト位置を前進させる
   *
   * @return this
   */
  forwardIndex_() {
    this.index++;

    if (this.maxIndex < this.index) {
      this.index = 0;
    }

    return this;
  }

  /**
   * プレイリスト位置を後退させる
   *
   * @return this
   */
  backwardIndex_() {
    this.index--;

    if (0 > this.index) {
      this.index = this.maxIndex;
    }

    return this;
  }
}
