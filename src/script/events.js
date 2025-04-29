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
            
            const now = new Date();
            now.setHours(0, 0, 0, 0); // 時間部分をリセット
            
            // 日程ごとにイベントを分類
            const scheduleMap = new Map(); // 日程ごとのイベントマップ
            
            // 今日のイベントを格納する配列
            const todayEvents = [];
            
            // ヘッダー行をスキップして各行を処理
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line || line.startsWith('//')) {
                    console.log(`スキップした行 ${i}: ${line.substring(0, 30)}...`);
                    continue; // 空行やコメント行はスキップ
                }
                
                const [date, region, venue, openTime, startTime, endTime, schedule] = line.split(',');
                
                // 基本データ（日付、地域、会場）がない行はスキップ
                if (!date || !region || !venue) {
                    console.log(`基本データ不足の行 ${i}: ${line}`);
                    continue;
                }
                
                // 日程（前期・後期など）を取得、ない場合は「その他」とする
                const scheduleKey = schedule && schedule.trim() ? schedule.trim() : 'その他';
                
                // イベントデータを作成
                const eventData = {
                    date: date,
                    region: region,
                    venue: venue,
                    openTime: openTime || '',
                    startTime: startTime || '',
                    endTime: endTime || '',
                    eventDate: new Date(date),
                    isIncomplete: !openTime || !startTime || !endTime, // 時間未定フラグ
                    isPast: new Date(date) < now // 過去イベントフラグ
                };
                
                // 今日のイベントかどうかチェック
                const eventDate = new Date(date);
                eventDate.setHours(0, 0, 0, 0); // 時間部分をリセット
                if (eventDate.getTime() === now.getTime() && !eventData.isIncomplete) {
                    todayEvents.push(eventData);
                }
                
                // 日程ごとのマップに追加
                if (!scheduleMap.has(scheduleKey)) {
                    scheduleMap.set(scheduleKey, []);
                }
                scheduleMap.get(scheduleKey).push(eventData);
            }
            
            // 既存の階層ページコンテナを取得
            const scheduleItemsContainer = document.getElementById('scheduleItems');
            const eventItemsContainer = document.getElementById('eventItems');
            const pastEventItemsContainer = document.getElementById('pastEventItems');
            
            // クリア
            scheduleItemsContainer.innerHTML = '';
            eventItemsContainer.innerHTML = '';
            pastEventItemsContainer.innerHTML = '';
            
            // 既存のオプションをクリア（隠しセレクトボックス用）
            venueSelect.innerHTML = '';
            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.textContent = "-- 会場を選択 --";
            venueSelect.appendChild(defaultOption);
            
            // 日程情報のグローバル変数
            window.scheduleData = {
                schedules: [], // 全ての日程
                currentSchedule: null, // 現在選択中の日程
                scheduleEvents: {} // 各日程のイベント
            };
            
            // 今日のイベントがある場合、最初に表示
            if (todayEvents.length > 0) {
                // 今日のイベントセクションを作成
                const todaySection = document.createElement('div');
                todaySection.className = 'hierarchy-today-section';
                
                // 今日のイベントヘッダーを作成
                const todayHeader = document.createElement('div');
                todayHeader.className = 'hierarchy-subheader today-header';
                todayHeader.innerHTML = `<i class="fas fa-star"></i> 本日のイベント`;
                todaySection.appendChild(todayHeader);
                
                // 今日のイベントを追加
                todayEvents.forEach(event => {
                    const eventItem = createEventItem(event);
                    eventItem.classList.add('today-event');
                    todaySection.appendChild(eventItem);
                });
                
                // 区切り線を追加
                const divider = document.createElement('div');
                divider.className = 'hierarchy-divider';
                todaySection.appendChild(divider);
                
                // 今日のイベントセクションを最初に追加
                scheduleItemsContainer.appendChild(todaySection);
                
                // 隠しセレクトボックスに今日のイベントセクションを追加
                const todayHeader2 = document.createElement('optgroup');
                todayHeader2.label = `【本日のイベント】`;
                todayHeader2.classList.add('today-events-group');
                venueSelect.appendChild(todayHeader2);
                
                todayEvents.forEach(event => {
                    const option = createEventOption(event);
                    option.classList.add('today-event-option');
                    todayHeader2.appendChild(option);
                });
            }
            
            // 日程ごとにイベントを処理して階層構造を作成
            scheduleMap.forEach((events, scheduleName) => {
                // 日程データを追加
                window.scheduleData.schedules.push(scheduleName);
                
                // 未来と過去のイベントに分類
                const futureEvents = events.filter(event => !event.isPast);
                const pastEvents = events.filter(event => event.isPast);
                
                // 日付順にソート
                futureEvents.sort((a, b) => a.eventDate - b.eventDate);
                pastEvents.sort((a, b) => b.eventDate - a.eventDate); // 過去イベントは新しい順
                
                // スケジュールデータに追加
                window.scheduleData.scheduleEvents[scheduleName] = {
                    future: futureEvents,
                    past: pastEvents
                };
                
                // 日程選択肢を追加
                const scheduleItem = document.createElement('div');
                scheduleItem.className = 'hierarchy-item schedule-item';
                scheduleItem.dataset.schedule = scheduleName;
                
                // アイコンとテキストを追加
                scheduleItem.innerHTML = `
                    <i class="fas fa-calendar-alt"></i>
                    <span>${scheduleName}</span>
                    <span class="badge">${futureEvents.length + pastEvents.length}</span>
                `;
                
                // クリックイベントを追加
                scheduleItem.addEventListener('click', function() {
                    selectSchedule(scheduleName);
                });
                
                // 日程リストに追加
                scheduleItemsContainer.appendChild(scheduleItem);
                
                // 隠しセレクトボックスにoptgroupを追加
                const scheduleHeader = document.createElement('optgroup');
                scheduleHeader.label = `【${scheduleName}】`;
                venueSelect.appendChild(scheduleHeader);
                
                // 未来のイベントをoptgroupに追加
                if (futureEvents.length > 0) {
                    futureEvents.forEach(event => {
                        const option = createEventOption(event);
                        scheduleHeader.appendChild(option);
                    });
                }
                
                // 過去のイベントをoptgroupに追加
                if (pastEvents.length > 0) {
                    const pastHeader = document.createElement('optgroup');
                    pastHeader.label = `【${scheduleName}】終了済みイベント`;
                    pastHeader.classList.add('past-events-group');
                    venueSelect.appendChild(pastHeader);
                    
                    pastEvents.forEach(event => {
                        const option = createEventOption(event);
                        pastHeader.appendChild(option);
                    });
                }
            });
            
            console.log(`selectに追加したオプション数: ${venueSelect.options.length - 1}`); // デフォルトオプションを除く
            
            // 戻るボタンのイベントリスナーを設定
            document.getElementById('backToSchedule').addEventListener('click', function() {
                showScheduleList();
            });
            
            document.getElementById('backToEvents').addEventListener('click', function() {
                const currentSchedule = window.scheduleData.currentSchedule;
                if (currentSchedule) {
                    selectSchedule(currentSchedule);
                } else {
                    showScheduleList();
                }
            });
            
            // 会場選択のイベントリスナーを設定（隠しセレクトボックス用）
            venueSelect.removeEventListener('change', handleVenueSelection);
            venueSelect.addEventListener('change', handleVenueSelection);
            console.log('会場選択のイベントリスナーを設定しました');
        })
        .catch(error => {
            console.error('会場データの読み込みエラー:', error);
        });
}

// 選択された日程の内容を表示
function selectSchedule(scheduleName) {
    // 選択した日程を記録
    window.scheduleData.currentSchedule = scheduleName;
    
    // 日程ページを隠してイベントページを表示
    document.getElementById('scheduleList').style.display = 'none';
    document.getElementById('eventList').style.display = 'block';
    document.getElementById('pastEventList').style.display = 'none';
    
    // タイトルを更新
    document.getElementById('selectedScheduleTitle').textContent = `${scheduleName} イベント`;
    
    // イベントリストコンテナを取得
    const eventItemsContainer = document.getElementById('eventItems');
    eventItemsContainer.innerHTML = '';
    
    // 選択した日程のイベントを取得
    const scheduleEvents = window.scheduleData.scheduleEvents[scheduleName];
    
    // 将来のイベントを表示
    if (scheduleEvents.future.length > 0) {
        const futureHeader = document.createElement('div');
        futureHeader.className = 'hierarchy-subheader';
        futureHeader.textContent = '今後のイベント';
        eventItemsContainer.appendChild(futureHeader);
        
        scheduleEvents.future.forEach(event => {
            const eventItem = createEventItem(event);
            eventItemsContainer.appendChild(eventItem);
        });
    }
    
    // 過去のイベントがある場合は「終了済みイベント」ボタンを追加
    if (scheduleEvents.past.length > 0) {
        const pastEventsButton = document.createElement('div');
        pastEventsButton.className = 'hierarchy-item past-events-button';
        pastEventsButton.innerHTML = `
            <i class="fas fa-history"></i>
            <span>終了済みイベント</span>
            <span class="badge">${scheduleEvents.past.length}</span>
        `;
        
        // 終了済みイベントボタンのクリックイベント
        pastEventsButton.addEventListener('click', function() {
            showPastEvents(scheduleName);
        });
        
        eventItemsContainer.appendChild(pastEventsButton);
    }
}

// 終了済みイベントを表示
function showPastEvents(scheduleName) {
    // イベントページを隠して終了済みイベントページを表示
    document.getElementById('scheduleList').style.display = 'none';
    document.getElementById('eventList').style.display = 'none';
    document.getElementById('pastEventList').style.display = 'block';
    
    // タイトルを更新
    document.getElementById('selectedEventsTitle').textContent = `${scheduleName} 終了済みイベント`;
    
    // 終了済みイベントリストコンテナを取得
    const pastEventItemsContainer = document.getElementById('pastEventItems');
    pastEventItemsContainer.innerHTML = '';
    
    // 選択した日程の過去イベントを取得
    const pastEvents = window.scheduleData.scheduleEvents[scheduleName].past;
    
    // 過去イベントを表示
    pastEvents.forEach(event => {
        const eventItem = createEventItem(event);
        pastEventItemsContainer.appendChild(eventItem);
    });
}

// 日程リストを表示
function showScheduleList() {
    document.getElementById('scheduleList').style.display = 'block';
    document.getElementById('eventList').style.display = 'none';
    document.getElementById('pastEventList').style.display = 'none';
}

// イベントアイテムを作成
function createEventItem(event) {
    const eventItem = document.createElement('div');
    eventItem.className = 'hierarchy-item event-item';
    
    // 過去イベントかどうかのクラスを追加
    if (event.isPast) {
        eventItem.classList.add('past-event');
    }
    
    // 時間未定イベントかどうかのクラスを追加
    if (event.isIncomplete) {
        eventItem.classList.add('incomplete-event');
    }
    
    // 日付をMM/DD形式に変換
    const dateStr = formatDateMD(event.date);
    
    // アイコンとイベント情報を表示（新レイアウトに変更）
    let itemContent = `
        <i class="fas fa-map-marker-alt"></i>
        <div class="event-content">
            <div class="event-header">${dateStr}</div>
            <div class="event-name">${event.venue} (${event.region})</div>
        </div>
    `;
    
    // 時間未定の場合は表示を変更
    if (event.isIncomplete) {
        itemContent += '<span class="event-status">【時間未定】</span>';
    }
    
    eventItem.innerHTML = itemContent;
    
    // 時間未定でない場合のみクリックイベントを追加
    if (!event.isIncomplete) {
        eventItem.addEventListener('click', function() {
            // イベントデータを含むダミーオプションを作成してapplyVenueSelectionを呼び出す
            const dummyOption = document.createElement('option');
            dummyOption.dataset.date = event.date;
            dummyOption.dataset.region = event.region;
            dummyOption.dataset.venue = event.venue;
            dummyOption.dataset.openTime = event.openTime;
            dummyOption.dataset.startTime = event.startTime;
            dummyOption.dataset.endTime = event.endTime;
            
            // イベント選択を適用
            applyVenueSelection(dummyOption);
            
            // 設定パネルを閉じる（オプション）
            // closeSettingsPanel();
        });
    }
    
    return eventItem;
}

// イベントオプションを作成する関数
function createEventOption(event) {
    const option = document.createElement('option');
    
    // 日付 - 会場名（地域）の形式で表示
    const dateStr = formatDateMD(event.date);
    let optionText = `${dateStr} - ${event.venue}（${event.region}）`;
    
    // 時間未定の場合は表示を変更
    if (event.isIncomplete) {
        optionText += '【時間未定】';
        option.disabled = true; // 選択不可に設定
        option.classList.add('incomplete-event');
    } else if (event.isPast) {
        option.classList.add('past-event');
    }
    
    option.value = optionText;
    option.textContent = optionText;
    
    // データ属性にイベント情報を追加
    option.dataset.date = event.date;
    option.dataset.region = event.region;
    option.dataset.venue = event.venue;
    option.dataset.openTime = event.openTime;
    option.dataset.startTime = event.startTime;
    option.dataset.endTime = event.endTime;
    
    return option;
}

// MM/DD形式の日付文字列を生成する関数
function formatDateMD(dateStr) {
    const date = new Date(dateStr);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}/${day}`;
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