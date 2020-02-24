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
   * @param string registererName
   * @param string playlistTitle
   */
  constructor(id, title, publishedAt, registererName, playlistTitle) {
    this.id             = id;
    this.title          = title;
    this.publishedAt    = publishedAt;
    this.registererName = registererName;
    this.playlistTitle  = playlistTitle;
  }

  // public

  /**
   * ユニークキーを取得する
   *
   * @return string
   */
  getUniqueKey() {
    return this.id + '-' + this.playlistTitle;
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

  // public static

  /**
   * オブジェクトから生成する
   */
  static fromObject(object) {
    return new this(object.id, object.title, object.publishedAt, object.registererName, object.playlistTitle);
  }
}
