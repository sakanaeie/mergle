/**
 * 動画情報
 */
export default class {
  /**
   * constructor
   *
   * @param string id
   * @param string title
   * @param string publishedAt
   * @param string playlistId
   * @param string playlistTitle
   */
  constructor(id, title, publishedAt, playlistId, playlistTitle) {
    this.id            = id;
    this.title         = title;
    this.publishedAt   = publishedAt;
    this.playlistId    = playlistId;
    this.playlistTitle = playlistTitle;

    this.isIgnored = false;
    this.isStared  = false;

    this.duplicatedPlaylistTitles = [];
  }

  // public

  /**
   * ユニークキーを取得する
   *
   * @return string
   */
  getUniqueKey() {
    return this.id + '-' + this.playlistId;
  }

  /**
   * プレイリスト追加日を "YYYY-MM-DD" 形式で取得する
   *
   * @return string
   */
  getFormattedPublishedAt() {
    let date = new Date(this.publishedAt);

    return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((num) => {
      let str = num.toString();
      if (2 > str.length) {
        str = '0' + str;
      }
      return str;
    }).join('-');
  }

  /**
   * プレイリスト名を重複込みで取得する
   *
   * @return string
   */
  getFormattedPlaylistTitle() {
    return [this.playlistTitle].concat(this.duplicatedPlaylistTitles).join(', ');
  }

  /**
   * 重複プレイリスト名を追加する
   *
   * @param string title
   */
  pushDuplicatedPlaylistTitle(title) {
    this.duplicatedPlaylistTitles.push(title);
  }

  /**
   * 重複プレイリスト名を削除する
   */
   removeDuplicatedPlaylistTitles() {
    this.duplicatedPlaylistTitles = [];
  }
}
