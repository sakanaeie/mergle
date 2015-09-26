var Config = {
  makeSec:      60 * 8,
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
    provider: 0,
    id:       1,
    url:      2,
    title:    3,
    duration: 4,
  },
};
