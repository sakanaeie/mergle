/**
 * YouTubeAPI
 *
 * @see YouTubeService https://developers.google.com/apps-script/advanced/youtube
 * @see YouTubeAPI v3  https://developers.google.com/youtube/v3/?hl=ja
 * @see API Response   https://developers.google.com/youtube/v3/docs/videos?hl=ja
 */
var Youtube = (function() {
  // constructor ---------------------------------------------------------------
  function Youtube(id) {
    this.provider = 'youtube';
    this.id       = id;
    this.url      = buildUrl(id);
    this.title    = '';
    this.duration = null;
    this.response = null;
    this.canEmbed = false;
    this.tooManyRecentCalls = false;

    if (null !== this.id) {
      try {
        this.response = callAPI(this.id);
        if (null !== this.response) {
          this.title    = this.response.snippet.title;
          this.canEmbed = this.response.status.embeddable; // 埋め込み可能であるかどうか

          // PT#M#Sの形式であるため、分と秒を分離し、動画再生時間(秒単位)を算出する
          var duration  = this.response.contentDetails.duration;
          var minute    = duration.match(/([0-9]*)M/)[1] || 0;
          var second    = duration.match(/([0-9]*)S/)[1] || 0;
          this.duration = minute * 60 + second * 1;
        }
      } catch (e) {
        // 動画が削除されたときなど
        MyUnit.log(['YoutubeServiceで例外が発生しました', e]);
        if (null !== e.message.match('too_many_recent_calls')) {
          // APIアクセス過多警告, この場合は全体の処理を停止するべきである
          this.tooManyRecentCalls = true;
        }
      }
      Utilities.sleep(1000); // too_many_recent_callsが発生しないよう、少し休む
    }
  }

  // public --------------------------------------------------------------------
  /**
   * 問題があるかどうか
   */
  Youtube.prototype.hasProblem = function() {
    return (null === this.id || null === this.response || !this.canEmbed);
  };

  // public static -------------------------------------------------------------
  /**
   * urlからインスタンスを生成する
   */
  Youtube.fromUrl = function(url) {
    return new Youtube(parseUrl(url));
  };

  // private static ------------------------------------------------------------
  /**
   * urlからidを取り出す
   */
  function parseUrl(url) {
    var found = url.match(/^https?:\/\/www.youtube.com\/watch\?v=([a-zA-Z0-9-_]+)/);
    return (null === found) ? null : found[1];
  }

  /**
   * idからurlを作る
   */
  function buildUrl(id) {
    return 'https://www.youtube.com/watch?v=' + id;
  }

  /**
   * YouTubeAPIを叩き、動画の情報を取得する
   */
  function callAPI(id) {
    var response = YouTube.Videos.list('snippet, contentDetails, status', {
      id: id,
      regionCode: 'JP',
    });
    return response.items[0] || null
  }

  return Youtube;
})();
