const MAX_NUM_OF_PLAYLIST = 10;

function doGet(e) {
  let items = getPlaylists(e.parameter.plid_csv);

  // jsonpレスポンスを返す
  return ContentService.createTextOutput(
    e.parameter.callback + '(' + JSON.stringify(items) + ')'
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getPlaylists(idsCSV) {
  let ids = idsCSV.split(',');
  if (MAX_NUM_OF_PLAYLIST < ids.length) {
    return {};
  }

  // プレイリストを取得する
  let playlistsResponse = YouTube.Playlists.list('snippet', {
    id:         idsCSV,
    maxResults: MAX_NUM_OF_PLAYLIST,
  });

  // プレイリストIDをキーにする
  let playlists = {};
  playlistsResponse.items.forEach((playlist) => {
    playlists[playlist.id] = {
      title: playlist.snippet.title,
      items: [],
    };
  });

  // プレイリストアイテムを取得する
  ids.forEach((id) => {
    let pageToken = null;
    do {
      let itemsResponse = YouTube.PlaylistItems.list('snippet', {
        playlistId: id,
        pageToken:  pageToken,
        maxResults: 50, // 最大
      });

      itemsResponse.items.forEach((item) => {
        playlists[item.snippet.playlistId].items.push({
          id:             item.snippet.resourceId.videoId,
          title:          item.snippet.title,
          registererName: item.snippet.channelTitle, // プレイリストに追加したユーザ
          publishedAt:    item.snippet.publishedAt,  // プレイリストに追加した日時
        });
      });

      pageToken = itemsResponse.nextPageToken || null;

      Utilities.sleep(100); // too_many_recent_callsが発生しないよう、少し休む
    } while (null !== pageToken);
  });

  return playlists;
}
