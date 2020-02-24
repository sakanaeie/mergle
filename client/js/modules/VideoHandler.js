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
    for (const playlistId in playlists) {
      let playlist = playlists[playlistId];
      videos = videos.concat(playlist.items.map(video => {
        return new Video(video.id, video.title, video.publishedAt, playlistId, playlist.title);
      }));
    }
    return videos;
  }
}
