/**
 * events.js - イベント情報の読み込みと処理
 */

import { formatTimeForInput, formatDateForDisplay, formatTimeDifference } from './time.js';
import { saveSettings } from './settings.js';

// イベントCSVを読み込んで今日または次回のイベントを自動ロードする
function loadEventData() {
    // 既に保存された設定があるかチェック
    const hasSavedSettings = localStorage.getItem('openTime') && 
                            localStorage.getItem('startTime') && 
                            localStorage.getItem('endTime');

    return fetch('events.csv')
        .then(response => response.text())
        .then(data => {
            // CSVをパースする
            const lines = data.split('\n');
            
            // ヘッダー行をスキップして各行を処理
            const events = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line || line.startsWith('//')) continue; // 空行やコメント行はスキップ
                
                const [date, region, venue, openTime, startTime, endTime] = line.split(',');
                if (!date || !region || !venue || !openTime || !startTime || !endTime) continue; // 必須データがない行はスキップ
                
                events.push({
                    date: date,
                    region: region,
                    venue: venue,
                    openTime: openTime,
                    startTime: startTime,
                    endTime: endTime
                });
            }
            
            // 今日の日付を取得
            const today = new Date();
            today.setHours(0, 0, 0, 0); // 時間部分をリセット
            
            // 今日のイベントを探す
            let todayEvent = null;
            let nextEvent = null;
            let earliestFutureDate = null;
            
            for (const event of events) {
                const eventDate = new Date(event.date);
                eventDate.setHours(0, 0, 0, 0); // 時間部分をリセット
                
                // 日付を比較
                if (eventDate.getTime() === today.getTime()) {
                    todayEvent = event;
                    break; // 今日のイベントが見つかったら終了
                } else if (eventDate > today) {
                    // 未来のイベントの場合、最も近い日付のものを記憶
                    if (!earliestFutureDate || eventDate < earliestFutureDate) {
                        earliestFutureDate = eventDate;
                        nextEvent = event;
                    }
                }
            }
            
            // 今日のイベントがあればそれを、なければ次のイベントをロード対象とする
            const eventToLoad = todayEvent || nextEvent;
            
            if (eventToLoad) {
                // 設定済みの場合、近い将来のイベントは自動ロードしない
                if (hasSavedSettings) {
                    // イベント日付との差を計算（日数）
                    const eventDate = new Date(eventToLoad.date);
                    const daysDifference = Math.round((eventDate - today) / (1000 * 60 * 60 * 24));
                    
                    // 設定が保存されていて、イベントが3日以内の近い将来である場合は自動ロードしない
                    if (daysDifference > 0 && daysDifference <= 3) {
                        console.log(`${daysDifference}日後のイベントが見つかりましたが、既存の設定を優先します`);
                        return false;
                    }
                }
                
                // イベント情報を画面に反映
                loadEventToUI(eventToLoad);
                return true;
            } else {
                // 該当するイベントがない場合は何もしない
                console.log('今日または将来のイベントが見つかりませんでした');
                return false;
            }
        })
        .catch(error => {
            console.error('イベントデータの読み込みエラー:', error);
            return false;
        });
}

// イベント情報をUIに適用する
function loadEventToUI(event) {
    // イベントの日付を取得
    const eventDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 時間部分をリセット
    
    // イベントが過去のものかチェック
    const isPastEvent = eventDate < today;
    
    // 既存の設定があるかチェック
    const hasSavedSettings = localStorage.getItem('openTime') && 
                            localStorage.getItem('startTime') && 
                            localStorage.getItem('endTime');
    
    // 既存の設定があり、イベントが次回（明日など）のものであるか確認
    const isUpcomingEvent = eventDate > today;
    const daysDifference = Math.round((eventDate - today) / (1000 * 60 * 60 * 24));
    const isNearFutureEvent = isUpcomingEvent && daysDifference <= 3; // 3日以内の近い将来
    
    // 過去のイベントの場合のみ確認ダイアログを表示
    // 将来のイベントで既存設定がある場合は確認しない
    if (isPastEvent && !(hasSavedSettings && isNearFutureEvent)) {
        const confirmLoad = confirm(`${formatDateForDisplay(event.date)}のイベントは既に終了している可能性があります。このイベント情報を読み込みますか？`);
        if (!confirmLoad) {
            // キャンセルされた場合は読み込みを中止
            return false;
        }
    }
    
    // ヘッダーテキストを会場(MM/DD 地域)形式で設定
    const headerText = document.getElementById('headerText');
    const eventTitleInput = document.getElementById('eventTitle');
    
    // 日付をMM/DD形式に変換
    const month = eventDate.getMonth() + 1; // 月は0始まりなので+1
    const day = eventDate.getDate();
    const dateStr = `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
    
    // 会場 (MM/DD 地域) 形式のタイトルを作成（手動選択時と同じフォーマット）
    const title = `${event.venue} (${dateStr} ${event.region})`;
    
    eventTitleInput.value = title;
    document.title = title;
    localStorage.setItem('headerText', title);
    
    // 都道府県のカッコの前に改行タグを追加
    const formattedTitle = title.replace(/\(/g, '<br>(');
    headerText.innerHTML = formattedTitle;
    
    // 時間をフォーム入力に設定
    document.getElementById('openTime').value = event.openTime.substring(0, 5); // HH:MM形式に変換
    document.getElementById('startTime').value = event.startTime.substring(0, 5);
    document.getElementById('endTime').value = event.endTime.substring(0, 5);
    
    // 開催日を表示
    const formattedDate = `${eventDate.getFullYear()}年${eventDate.getMonth() + 1}月${eventDate.getDate()}日`;
    
    // ステータス表示を更新
    let statusMsg = '';
    
    if (eventDate.getTime() === today.getTime()) {
        statusMsg = `本日(${formattedDate})のイベント情報をロードしました。`;
    } else if (isPastEvent) {
        statusMsg = `過去(${formattedDate})のイベント情報をロードしました。`;
    } else {
        statusMsg = `次回(${formattedDate})のイベント情報をロードしました。`;
    }
    
    document.getElementById('status').textContent = statusMsg;
    
    // CSVから読み込んだ時間を自動的に設定し、カウントダウンを開始する
    autoSetTimes(event.date, event.openTime, event.startTime, event.endTime);
    
    return true;
}

// CSVから読み込んだ時間を自動的に設定してカウントダウンを開始する関数
function autoSetTimes(eventDate, openTimeStr, startTimeStr, endTimeStr) {
    // イベント日付を取得
    const eventDateObj = new Date(eventDate);
    
    // 時間部分を抽出
    const [openHours, openMinutes] = openTimeStr.split(':').map(Number);
    const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
    const [endHours, endMinutes] = endTimeStr.split(':').map(Number);
    
    // 日時オブジェクトを作成
    let newOpenTime = new Date(eventDateObj);
    newOpenTime.setHours(openHours, openMinutes, 0, 0);
    
    let newStartTime = new Date(eventDateObj);
    newStartTime.setHours(startHours, startMinutes, 0, 0);
    
    let newEndTime = new Date(eventDateObj);
    newEndTime.setHours(endHours, endMinutes, 0, 0);
    
    // 終演時間が開演時間より前の場合は翌日に設定
    if (newEndTime <= newStartTime) {
        newEndTime.setDate(newEndTime.getDate() + 1);
    }
    
    // 時間を設定
    const timeSettings = {
        openTime: newOpenTime,
        startTime: newStartTime,
        endTime: newEndTime
    };
    
    // 設定を保存して公開イベントを発火
    saveSettings(timeSettings.openTime, timeSettings.startTime, timeSettings.endTime);
    
    // カスタムイベントを発火して時間設定の更新を通知
    const event = new CustomEvent('timeSettingsUpdated', { 
        detail: timeSettings
    });
    document.dispatchEvent(event);
    
    // 現在時刻を取得
    const now = new Date();
    
    // 現在時刻との比較とステータス更新
    let statusMessage = '';
    if (now >= newEndTime) {
        statusMessage = "設定した終演時間は過ぎています";
    } else if (now >= newStartTime) {
        statusMessage = "イベント進行中";
    } else if (now >= newOpenTime) {
        statusMessage = "開場中";
    } else {
        statusMessage = `開場まであと${formatTimeDifference(now, newOpenTime)}`;
    }
    
    const statusElem = document.getElementById('status');
    if (statusElem) {
        statusElem.textContent = statusMessage;
    }
    
    return timeSettings;
}

// 会場データをCSVから読み込み、選択フィールドを初期化する関数
function initVenueSearch() {
    // コンソールログを追加して診断
    console.log('initVenueSearch関数が呼び出されました');
    
    // select要素を取得
    const venueSelect = document.getElementById('venue-select');
    
    if (!venueSelect) {
        console.error('venue-select要素が見つかりません');
        return;
    }
    
    fetch('events.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error(`CSVの取得に失敗しました: ${response.status}`);
            }
            console.log('CSVファイルの取得に成功しました');
            return response.text();
        })
        .then(data => {
            console.log('CSVデータ:', data.substring(0, 200) + '...'); // 最初の200文字を表示
            
            // CSVをパースする
            const lines = data.split('\n');
            console.log(`CSV行数: ${lines.length}`);
            
            // ヘッダー行をスキップして各行を処理
            const events = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line || line.startsWith('//')) {
                    console.log(`スキップした行 ${i}: ${line.substring(0, 30)}...`);
                    continue; // 空行やコメント行はスキップ
                }
                
                const [date, region, venue, openTime, startTime, endTime] = line.split(',');
                if (!date || !region || !venue || !openTime || !startTime || !endTime) {
                    console.log(`必須データ不足の行 ${i}: ${line}`);
                    continue; // 必須データがない行はスキップ
                }
                
                events.push({
                    date: date,
                    region: region,
                    venue: venue,
                    openTime: openTime,
                    startTime: startTime,
                    endTime: endTime
                });
            }
            
            console.log(`パースしたイベント数: ${events.length}`);
            
            // 既存のオプションをクリア（最初のデフォルトオプションは保持）
            const defaultOption = venueSelect.options[0];
            venueSelect.innerHTML = '';
            venueSelect.appendChild(defaultOption);
            
            // 取得したイベントデータをselect要素に追加
            events.forEach((event, index) => {
                const option = document.createElement('option');
                
                // 会場名（地域名）- 開催日 の形式で表示
                const optionText = `${event.venue}（${event.region}） - ${formatDateForDisplay(event.date)}`;
                option.value = optionText;
                option.textContent = optionText;
                
                // データ属性にイベント情報を追加
                option.dataset.date = event.date;
                option.dataset.region = event.region;
                option.dataset.venue = event.venue;
                option.dataset.openTime = event.openTime;
                option.dataset.startTime = event.startTime;
                option.dataset.endTime = event.endTime;
                
                venueSelect.appendChild(option);
                
                if (index < 3) {
                    console.log(`追加したオプション ${index}: ${optionText}`);
                }
            });
            
            console.log(`selectに追加したオプション数: ${venueSelect.options.length - 1}`); // デフォルトオプションを除く
            
            // 会場選択のイベントリスナーを設定
            venueSelect.removeEventListener('change', handleVenueSelection);
            venueSelect.addEventListener('change', handleVenueSelection);
            console.log('会場選択のイベントリスナーを設定しました');
        })
        .catch(error => {
            console.error('会場データの読み込みエラー:', error);
        });
}

// 選択された会場オプションを適用する共通関数
function applyVenueSelection(selectedOption) {
    if (!selectedOption) return;
    
    // 選択されたイベントの情報を取得
    const eventDate = selectedOption.dataset.date;
    const eventRegion = selectedOption.dataset.region;
    const eventVenue = selectedOption.dataset.venue;
    const eventOpenTime = selectedOption.dataset.openTime;
    const eventStartTime = selectedOption.dataset.startTime;
    const eventEndTime = selectedOption.dataset.endTime;
    
    // イベントの日付を取得
    const dateObj = new Date(eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 時間部分をリセット
    
    // イベントが過去のものかチェック
    const isPastEvent = dateObj < today;
    
    // 既存の設定があるかチェック
    const hasSavedSettings = localStorage.getItem('openTime') && 
                            localStorage.getItem('startTime') && 
                            localStorage.getItem('endTime');
    
    // 日付の差を計算（日数）
    const daysDifference = Math.round((dateObj - today) / (1000 * 60 * 60 * 24));
    const isNearFutureEvent = daysDifference > 0 && daysDifference <= 3; // 3日以内の近い将来
    
    // 過去のイベントの場合のみ確認ダイアログを表示
    // 近い将来のイベントで既存設定がある場合は確認しない
    if (isPastEvent && !(hasSavedSettings && isNearFutureEvent)) {
        const confirmLoad = confirm(`${formatDateForDisplay(eventDate)}のイベントは既に終了している可能性があります。このイベント情報を読み込みますか？`);
        if (!confirmLoad) {
            // キャンセルされた場合は読み込みを中止し、選択を元に戻す
            document.getElementById('venue-select').selectedIndex = 0;
            return;
        }
    }
    
    // フォームに値を設定
    document.getElementById('openTime').value = eventOpenTime.substring(0, 5);
    document.getElementById('startTime').value = eventStartTime.substring(0, 5);
    document.getElementById('endTime').value = eventEndTime.substring(0, 5);
    
    // 日付をMM/DD形式に変換
    const month = dateObj.getMonth() + 1; // 月は0始まりなので+1
    const day = dateObj.getDate();
    const dateStr = `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
    
    // イベントタイトルを設定（会場名と日付、地域名を含める）
    const title = `${eventVenue} (${dateStr} ${eventRegion})`;
    document.getElementById('eventTitle').value = title;
    
    // 都道府県のカッコの前に改行タグを追加
    const formattedTitle = title.replace(/\(/g, '<br>(');
    document.getElementById('headerText').innerHTML = formattedTitle;
    document.title = title;
    localStorage.setItem('headerText', title);
    
    // 選択した会場の日付情報をデータ属性として保存
    document.body.dataset.selectedEventDate = eventDate;
    
    // ステータス更新
    const formattedDate = formatDateForDisplay(eventDate);
    const statusElem = document.getElementById('status');
    if (statusElem) {
        // 過去イベントの場合は表示メッセージを変更
        if (isPastEvent) {
            statusElem.textContent = `過去(${formattedDate})の「${eventVenue}」の情報を設定しました`;
        } else if (dateObj.getTime() === today.getTime()) {
            statusElem.textContent = `本日(${formattedDate})の「${eventVenue}」の情報を設定しました`;
        } else {
            statusElem.textContent = `${formattedDate}の「${eventVenue}」の情報を設定しました`;
        }
    }
    
    // 自動的に時間設定を適用する
    setTimeout(() => {
        // applyTimeSettings関数を呼び出す（時間設定ボタンが不要になったため）
        if (typeof window.applyTimeSettings === 'function') {
            window.applyTimeSettings();
        } else {
            // 直接イベントをディスパッチして時間設定の適用をトリガー
            const event = new Event('autoApplyTimeSettings');
            document.dispatchEvent(event);
        }
    }, 100);
}

// 会場選択処理のハンドラー
function handleVenueSelection(event) {
    const selectedIndex = event.target.selectedIndex;
    if (selectedIndex === 0) return; // 最初のオプション（プレースホルダー）は無視
    
    const selectedOption = event.target.options[selectedIndex];
    // 選択されたオプションの情報を適用
    applyVenueSelection(selectedOption);
}

// モジュールとしてエクスポート
export {
    loadEventData,
    loadEventToUI,
    autoSetTimes,
    initVenueSearch,
    applyVenueSelection,
    handleVenueSelection
};