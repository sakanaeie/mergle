# syngle

GoogleSpreadSheetとGoogleAppsScriptを利用した動画の同期再生機能です

## 準備

* シートを作成し、スクリプトをコピーする
  * server/tool/merge.shでファイルをまとめることができるが、config.jsは含まれないことに注意
* config.jsを適宜編集する
* トリガーを適宜設定する
  * scheduler()をConfig.makeSecより小さい間隔で実行させること
