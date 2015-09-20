var Config = {
  makeSec:      60 * 20,
  gapSec:       6,
  historyCount: 50,
  password:     'hogefuga',
};

var SheetInfo = {
  id: 'hogefuga',
  nameMaster: 'master', // 追加用のシート名
  nameDelete: 'delete', // 削除用のシート名
  nameBad:    'bad',    // 不愉快用のシート名
  nameLog:    'log',    // ログ用のシート名
  column: {
    index:    0,
    provider: 1,
    id:       2,
    url:      3,
    title:    4,
    duration: 5,
  },
};
