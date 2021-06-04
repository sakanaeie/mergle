const MAX_NUM_OF_PLAYLIST = 10;

function doGet(e) {
  let items;
  switch (e.parameter.type) {
    case 'star':
      items = saveLoadStar(e.parameter.pass, e.parameter.vid_csv);
      break;
    default:
      items = getPlaylists(e.parameter.plid_csv);
      break;
  }

  // jsonpレスポンスを返す
  return ContentService.createTextOutput(
    e.parameter.callback + '(' + JSON.stringify(items) + ')'
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function saveLoadStar(pass, idsCsv) {
  let sheet  = SpreadsheetApp.openById('1ylXqZBXBLUMSSQ73yqto--EIce-T4yiR9WTFXnu5Jr4').getSheetByName('list');
  let data   = sheet.getDataRange().getValues();
  let result = {};
  if (idsCsv.length > 0) {
    // 重複行を削除する
    data.forEach((row, i) => {
      if (pass.toString() === row[0]) {
        sheet.deleteRow(i + 1);
      }
    });

    // 保存する
    sheet.appendRow([pass, idsCsv]);
    result.saveSucceeded = true;
  } else {
    let picked = '';
    data.forEach((row, i) => {
      if (pass.toString() === row[0]) {
        picked = row[1];
      }
    });
    result.idsCsv = picked;
  }

  return result;
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
          publishedAt:    item.snippet.publishedAt, // プレイリストに追加した日時

          // 下記パラメータは "プレイリストに追加したユーザ" とマニュアルにあるが、プレイリスト作成者である
          // registererName: item.snippet.channelTitle,
        });
      });

      pageToken = itemsResponse.nextPageToken || null;

      Utilities.sleep(100); // too_many_recent_callsが発生しないよう、少し休む
    } while (null !== pageToken);
  });

  return playlists;
}
