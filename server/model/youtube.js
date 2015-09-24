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
    this.url      = buildUrl_(id);
    this.title    = '';
    this.duration = null;
    this.response = null;
    this.status   = null;
    this.canEmbed = false;
    this.tooManyRecentCalls = false;

    if (null !== this.id) {
      try {
        this.response = callAPI_(this.id);
        if (null !== this.response) {
          this.title    = this.response.snippet.title;
          this.status   = this.response.status.uploadStatus;
          this.canEmbed = this.response.status.embeddable; // 埋め込み可能であるかどうか

          // PT<int>M<int>Sの形式であるため、分と秒を分離し、動画再生時間(秒単位)を算出する
          var duration  = this.response.contentDetails.duration;
          var resultM   = duration.match(/([0-9]*)M/);
          var minute    = (null !== resultM) ? resultM[1] : 0;
          var resultS   = duration.match(/([0-9]*)S/);
          var second    = (null !== resultS) ? resultS[1] : 0;
          this.duration = minute * 60 + second * 1;
        }
      } catch (e) {
        // 動画が削除されたときなど
        MyUtil.log(['YouTubeServiceで例外が発生しました', e]);
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
    // パラメータ欠損、ステータス確認 (最も簡単な確認から行なう)
    if (null === this.id || null === this.response || !this.canEmbed || this.isStatusProblem_()) {
      return true;
    }

    // 国籍規制
    if (null !== this.response && 'undefined' !== typeof this.response.contentDetails.regionRestriction) {
      if ('undefined' !== typeof this.response.contentDetails.regionRestriction.blocked) {
        if (-1 !== this.response.contentDetails.regionRestriction.blocked.indexOf('JP')) {
          // 拒否リストの日本があるとき
          MyUtil.log(['問題のある動画が検出されました, blocked', this]);
          return true;
        }
      }
      if ('undefined' !== typeof this.response.contentDetails.regionRestriction.allowed) {
        if (-1 === this.response.contentDetails.regionRestriction.allowed.indexOf('JP')) {
          // 許可リストの日本がないとき
          MyUtil.log(['問題のある動画が検出されました, not allowed', this]);
          return true;
        }
      }
    }

    // 音声差し止め
    if (!this.response.contentDetails.licensedContent) {
      // 使用許可のある動画でないとき、htmlを直接取得し、特定文言の有無を確認する
      if (-1 !== MyUtil.fetchWithRetry(this.url).getContentText().indexOf('この動画では著作権で保護された音声トラックが使用されていました。著作権者からの申し立てにより、音声トラックはミュート状態となっています。')) {
        MyUtil.log(['問題のある動画が検出されました, muted for copyright violations', this]);
        return true;
      }
    }

    return false;
  };

  // private -------------------------------------------------------------------
  /**
   * status.uploadStatusに問題があるかどうか
   * deleted, failed, processed, rejected, uploaded のいずれかである
   */
  Youtube.prototype.isStatusProblem_ = function() {
    if ('deleted' === this.status || 'failed' === this.status || 'rejected' === this.status) {
      MyUtil.log(['問題のある動画が検出されました, invalid status', this]);
      return true;
    } else {
      return false;
    }
  }

  // public static -------------------------------------------------------------
  /**
   * urlからインスタンスを生成する
   */
  Youtube.fromUrl = function(url) {
    return new Youtube(parseUrl_(url));
  };

  // private static ------------------------------------------------------------
  /**
   * urlからidを取り出す
   */
  function parseUrl_(url) {
    var found = url.match(/^https?:\/\/www.youtube.com\/watch\?v=([a-zA-Z0-9-_]+)/);
    return (null === found) ? null : found[1];
  }

  /**
   * idからurlを作る
   */
  function buildUrl_(id) {
    return 'https://www.youtube.com/watch?v=' + id;
  }

  /**
   * YouTubeAPIを叩き、動画の情報を取得する
   */
  function callAPI_(id) {
    var response = YouTube.Videos.list('snippet, contentDetails, status', {
      id: id,
      regionCode: 'JP',
    });
    return response.items[0] || null
  }

  return Youtube;
})();
