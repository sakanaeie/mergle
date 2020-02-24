import Video from './Video.js';

/**
 * 動画情報ハンドラ
 */
export default class {
  constructor() {
  }

  // public

  /**
   * フラットな配列に変換する
   *
   * @param object playlists AppsScriptのレスポンス
   * @return Video[] videos
   */
  convertToFlatListFromPlaylists(playlists) {
    let videos = [];
    for (const key in playlists) {
      let playlist = playlists[key];
      videos = videos.concat(playlist.items.map(video => {
        return new Video(video.id, video.title, video.publishedAt, video.registererName, playlist.title);
      }));
    }
    return videos;
  }
}
