var Config = {
  limitSec:     60 * 10,
  makeSec:      60 * 8,
  gapSec:       6,
  historyCount: 50,
  jockeyEnable: true,
  pickupEnable: true,
  pickupStart:  '1355',
  pickupEnd:    '1455',
};

var SheetInfo = {
  id: 'hogefuga',
  nameMaster: 'master', // 追加用のシート名
  nameDelete: 'delete', // 削除用のシート名
  nameLog:    'log',    // ログ用のシート名
  column: {
    provider:  0,
    id:        1,
    url:       2,
    title:     3,
    duration:  4,
    good:      5,
    bad:       6,
    createdAt: 7,
  },
};

var YoutubePickupListIds = [
  'PLFgquLnL59amuJEYnzXUxiZw5UXCVhWkn', // 最新の動画
];

var YoutubeJockeyInfos = [
  {
    name:  'test',
    id:    'PLFgquLnL59amuJEYnzXUxiZw5UXCVhWkn',
    start: '1455',
    end:   '1555',
  },
];
