/**
 * core.js - アプリケーションのコア機能
 */

import * as Time from './time.js';
import * as UI from './ui.js';
import * as Settings from './settings.js';
import * as Events from './events.js';

// グローバル変数
let openTime = null;
let startTime = null;
let endTime = null;
let countdownInterval = null;

// DOM要素
let currentTimeElem;
let openCountdownCombinedElem;
let endCountdownCombinedElem;
let startCountdownCombinedElem;
let openTimeInput;
let startTimeInput;
let endTimeInput;
let setTimesBtn;
let resetBtn;
let statusElem;
let presetBtns;

// 現在時刻を表示する関数
function updateCurrentTime() {
    const now = new Date();
    // 現在時刻に日付情報を追加
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 月は0始まりなので+1
    const day = now.getDate();
    const formattedDate = `<span class="date-small">${Time.padZero(month)}/${Time.padZero(day)}</span>`;
    
    // 現在時刻の表示を更新（日付を含める）- MM/DD部分を秒数と同じスタイルにするが、フォントサイズを小さく
    currentTimeElem.innerHTML = `${formattedDate}${Time.formatTime(now, true)}`;

    // イベント日付情報を更新（常に呼び出す）
    updateEventDateInfo();

    // カウントダウン表示を更新
    if (startTime) {
        // 各時間に対するカウントダウン状態を先に計算
        const timeToOpen = openTime ? openTime - now : null;
        const timeToStart = startTime - now;
        const timeToEnd = endTime - now;
        
        const openIsPast = openTime ? timeToOpen < 0 : false;
        const startIsPast = timeToStart < 0;
        const endIsPast = timeToEnd < 0;

        // 開場までのカウントダウン
        if (openTime) {
            if (openIsPast) {
                // 開場後は 00:00:00 を表示
                openCountdownCombinedElem.innerHTML = '<span class="time-label">開場 ' + Time.formatTime(openTime, false) + '</span> <span class="time-value">00:00<span class="seconds">:00</span></span>';
                openCountdownCombinedElem.classList.remove('warning', 'danger');
                openCountdownCombinedElem.classList.add('elapsed');
                
                // 開場終了、開演前の場合は開場タイマーをアクティブに
                if (!startIsPast) {
                    openCountdownCombinedElem.classList.add('active');
                    startCountdownCombinedElem.classList.remove('active');
                    endCountdownCombinedElem.classList.remove('active');
                }
            } else {
                // 開場前はカウントダウン表示
                openCountdownCombinedElem.innerHTML = '<span class="time-label">開場 ' + Time.formatTime(openTime, false) + ' まで</span> <span class="time-value">' + Time.formatMilliseconds(timeToOpen) + '</span>';

                // 警告色の適用
                openCountdownCombinedElem.classList.remove('warning', 'danger', 'elapsed');
                
                // まだ何も始まっていない場合は開場タイマーをアクティブに
                openCountdownCombinedElem.classList.add('active');
                startCountdownCombinedElem.classList.remove('active');
                endCountdownCombinedElem.classList.remove('active');
                
                if (timeToOpen <= 60000) { // 1分前
                    openCountdownCombinedElem.classList.add('warning');
                }
                if (timeToOpen <= 10000) { // 10秒前
                    openCountdownCombinedElem.classList.add('danger');
                }
            }
        } else {
            // 開場時間が設定されていない場合は非表示
            openCountdownCombinedElem.innerHTML = '<span class="time-label">開場時間未設定</span>';
            openCountdownCombinedElem.classList.remove('active');
        }

        // 開演までのカウントダウン
        if (startIsPast) {
            // 開演後は 00:00:00 を表示
            startCountdownCombinedElem.innerHTML = '<span class="time-label">開演 ' + Time.formatTime(startTime, false) + '</span> <span class="time-value">00:00<span class="seconds">:00</span></span>';
            startCountdownCombinedElem.classList.remove('warning', 'danger');
            startCountdownCombinedElem.classList.add('elapsed');
            
            // 開演終了、終演前の場合は終演タイマーをアクティブに
            if (!endIsPast) {
                openCountdownCombinedElem.classList.remove('active');
                startCountdownCombinedElem.classList.remove('active');
                endCountdownCombinedElem.classList.add('active');
            }
        } else {
            // 開演前はカウントダウン表示
            startCountdownCombinedElem.innerHTML = '<span class="time-label">開演 ' + Time.formatTime(startTime, false) + ' まで</span> <span class="time-value">' + Time.formatMilliseconds(timeToStart) + '</span>';

            // 警告色の適用
            startCountdownCombinedElem.classList.remove('warning', 'danger', 'elapsed');
            
            // 開場後、開演前の場合は開演タイマーをアクティブに
            if (openTime && now >= openTime) {
                openCountdownCombinedElem.classList.remove('active');
                startCountdownCombinedElem.classList.add('active');
                endCountdownCombinedElem.classList.remove('active');
            }
            
            if (timeToStart <= 60000) { // 1分前
                startCountdownCombinedElem.classList.add('warning');
            }
            if (timeToStart <= 10000) { // 10秒前
                startCountdownCombinedElem.classList.add('danger');
            }
        }

        // 終演までのカウントダウン
        if (endIsPast) {
            // 終演後は経過時間をマイナス表示
            const elapsedAfterEnd = now - endTime;
            endCountdownCombinedElem.innerHTML = '<span class="time-label">終演 ' + Time.formatTime(endTime, false) + '</span> <span class="time-value">-' + Time.formatMilliseconds(elapsedAfterEnd) + '</span>';
            endCountdownCombinedElem.classList.remove('warning');
            endCountdownCombinedElem.classList.add('danger');
            
            // 終演後は終演タイマーをアクティブのまま
            openCountdownCombinedElem.classList.remove('active');
            startCountdownCombinedElem.classList.remove('active');
            endCountdownCombinedElem.classList.add('active');

            if (!startIsPast) {
                statusElem.textContent = "設定した終演時間は開演前に過ぎています";
            } else {
                statusElem.textContent = "イベント終了時間を過ぎています";
            }
        } else {
            // 終演前
            endCountdownCombinedElem.innerHTML = '<span class="time-label">終演 ' + Time.formatTime(endTime, false) + ' まで</span> <span class="time-value">' + Time.formatMilliseconds(timeToEnd) + '</span>';

            // 残り時間に応じてカラーを変更
            if (timeToEnd <= Time.dangerThreshold) {
                endCountdownCombinedElem.classList.remove('warning');
                endCountdownCombinedElem.classList.add('danger');
            } else if (timeToEnd <= Time.warningThreshold) {
                endCountdownCombinedElem.classList.remove('danger');
                endCountdownCombinedElem.classList.add('warning');
            } else {
                endCountdownCombinedElem.classList.remove('warning', 'danger');
            }

            // ステータス更新
            if (now >= startTime) {
                statusElem.textContent = "イベント進行中";
            } else if (openTime && now >= openTime) {
                statusElem.textContent = "開場中";
            } else if (openTime) {
                statusElem.textContent = `開場まであと${Time.formatTimeDifference(now, openTime)}`;
            } else {
                statusElem.textContent = `開演まであと${Time.formatTimeDifference(now, startTime)}`;
            }
        }
    }
}

// カウントダウン更新間隔を設定
function startCountdown() {
    // カウントダウンは updateCurrentTime 関数に統合したので、
    // 単に1秒ごとに更新するだけにします
    countdownInterval = setInterval(updateCurrentTime, 1000);
}

// イベント日付情報を表示する関数
function updateEventDateInfo() {
    // イベント日付要素を取得
    const eventDateElement = document.getElementById('eventDate');
    if (!eventDateElement) return; // 要素がなければ何もしない
    
    // 開演日時が設定されている場合、その日付を表示
    if (startTime) {
        const year = startTime.getFullYear();
        const month = startTime.getMonth() + 1;
        const day = startTime.getDate();
        const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][startTime.getDay()];
        
        // 日付を表示（年月日と曜日）
        eventDateElement.textContent = `${year}年${Time.padZero(month)}月${Time.padZero(day)}日(${dayOfWeek})`;
    } else {
        // 開演日時が設定されていない場合は現在の日付を表示
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()];
        
        eventDateElement.textContent = `${year}年${Time.padZero(month)}月${Time.padZero(day)}日(${dayOfWeek})`;
    }
}

// 時間設定ボタンの処理
function setupTimeButtons() {
    setTimesBtn.addEventListener('click', function() {
        const openValue = openTimeInput.value;
        const startValue = startTimeInput.value;
        const endValue = endTimeInput.value;

        if (!startValue || !endValue) {
            alert('開演時間と終演時間は必須です');
            return;
        }

        // 使用する日付を決定する
        // 会場選択から選択した日付があればそれを使用し、なければ今日の日付を使用
        let targetDate = new Date();
        const selectedEventDate = document.body.dataset.selectedEventDate;
        
        if (selectedEventDate) {
            // 会場選択から選択した日付を使用
            targetDate = new Date(selectedEventDate);
            console.log(`会場選択から日付を使用: ${selectedEventDate}`);
        } else {
            console.log('今日の日付を使用します');
        }
        
        // 開場時間の設定（任意）
        let newOpenTime = null;
        if (openValue) {
            const [openHours, openMinutes] = openValue.split(':').map(Number);
            newOpenTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(),
                openHours, openMinutes);
        }
        
        const [startHours, startMinutes] = startValue.split(':').map(Number);
        const [endHours, endMinutes] = endValue.split(':').map(Number);

        const newStartTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(),
            startHours, startMinutes);
        const newEndTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(),
            endHours, endMinutes);

        // 開場時間と開演時間の整合性チェック
        if (newOpenTime && newOpenTime >= newStartTime) {
            if (!confirm('開場時間が開演時間より後になっています。このまま設定しますか？')) {
                return;
            }
        }

        // 開演時間が終演時間より後の場合は、終演時間を翌日に設定
        if (newEndTime <= newStartTime) {
            if (confirm('終演時間は開演時間より前になっています。終演時間を翌日に設定しますか？')) {
                newEndTime.setDate(newEndTime.getDate() + 1);
            } else {
                return;
            }
        }

        // 時間を設定
        openTime = newOpenTime;
        startTime = newStartTime;
        endTime = newEndTime;

        // 設定を保存
        Settings.saveSettings(openTime, startTime, endTime);
        
        // マニュアル設定として記録
        Settings.saveManualSettingInfo(targetDate);
        
        // 会場選択後の日付情報をクリア（マニュアル設定が完了したため）
        document.body.dataset.selectedEventDate = '';
        
        // カウントダウンをリセット
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }

        // 現在時刻との比較
        const now = new Date();
        const statusMessage = Settings.getStatusMessage(now, openTime, startTime, endTime, true);
        
        // ステータスメッセージ更新
        statusElem.textContent = statusMessage;
        startCountdown();
    });
}

// リセットボタンの処理
function setupResetButton() {
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (confirm('設定をリセットしますか？')) {
                // インターバルをクリア
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                }

                // 変数をリセット
                openTime = null;
                startTime = null;
                endTime = null;

                // LocalStorageから設定を削除
                Settings.resetSettings();
                
                // 表示をリセット
                openCountdownCombinedElem.innerHTML = '<span class="time-label">開場</span> <span class="time-value">--:--<span class="seconds">:--</span></span>';
                startCountdownCombinedElem.innerHTML = '<span class="time-label">開演</span> <span class="time-value">--:--<span class="seconds">:--</span></span>';
                endCountdownCombinedElem.innerHTML = '<span class="time-label">終演</span> <span class="time-value">--:--<span class="seconds">:--</span></span>';
                
                // クラスをリセット
                openCountdownCombinedElem.classList.remove('warning', 'danger', 'elapsed');
                startCountdownCombinedElem.classList.remove('warning', 'danger', 'elapsed');
                endCountdownCombinedElem.classList.remove('warning', 'danger', 'elapsed');
                
                statusElem.textContent = "時間を設定してください";

                // 入力フィールドをクリア
                openTimeInput.value = '';
                
                // 現在時刻から入力フィールドのデフォルト値を設定
                const now = new Date();
                const defaultStart = new Date(now.getTime() + 15 * 60 * 1000); // 15分後
                const defaultEnd = new Date(now.getTime() + 75 * 60 * 1000);   // 1時間15分後

                startTimeInput.value = Time.formatTimeForInput(defaultStart);
                endTimeInput.value = Time.formatTimeForInput(defaultEnd);
            }
        });
    }
}

// プリセットボタンのセットアップ
function setupPresetButtons() {
    presetBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const startTimeStr = this.getAttribute('data-start');
            const openTimeStr = this.getAttribute('data-open');
            
            // 反復処理の確認ダイアログを表示
            if (confirm('反復処理を続行しますか？')) {
                // プリセットを適用
                UI.applyPreset(startTimeStr, openTimeStr);
            }
        });
    });
}

// プリセット選択のイベントリスナー
function setupPresetSelect() {
    const presetSelect = document.getElementById('preset-select');
    if (presetSelect) {
        presetSelect.addEventListener('change', function() {
            if (this.value === '') return; // 何も選択されていない場合は何もしない
            
            const selectedOption = this.options[this.selectedIndex];
            const startTimeStr = selectedOption.getAttribute('data-start');
            const openTimeStr = selectedOption.getAttribute('data-open');
            
            // プリセットを適用
            UI.applyPreset(startTimeStr, openTimeStr);
            
            // 選択をリセット（次回も同じプリセットを選べるように）
            setTimeout(() => {
                this.value = '';
            }, 100);
        });
    }
}

// プリセット再読み込みボタンの処理
function setupReloadPresetButton() {
    const reloadPresetBtn = document.getElementById('reloadPresetBtn');
    if (reloadPresetBtn) {
        reloadPresetBtn.addEventListener('click', function() {
            if (confirm('会場データを再読み込みしますか？')) {
                // 会場検索の初期化を再実行
                Events.initVenueSearch();
                statusElem.textContent = "会場データを再読み込みしました";
            }
        });
    }
}

// 保存された設定を読み込む
function loadSavedSettings() {
    const settings = Settings.loadSettings();
    if (settings) {
        openTime = settings.openTime;
        startTime = settings.startTime;
        endTime = settings.endTime;

        // 入力フィールドに値をセット
        if (openTime) {
            openTimeInput.value = Time.formatTimeForInput(openTime);
        }
        startTimeInput.value = Time.formatTimeForInput(startTime);
        endTimeInput.value = Time.formatTimeForInput(endTime);

        // ステータス更新
        const now = new Date();
        if (now >= endTime) {
            statusElem.textContent = "前回のイベントは終了しています";
        } else if (now >= startTime) {
            statusElem.textContent = "イベント進行中";
            startCountdown();
        } else if (openTime && now >= openTime) {
            statusElem.textContent = "開場中";
            startCountdown();
        } else if (openTime) {
            statusElem.textContent = `開場まであと${Time.formatTimeDifference(now, openTime)}`;
        } else {
            statusElem.textContent = `開演まであと${Time.formatTimeDifference(now, startTime)}`;
        }

        return true;
    }
    return false;
}

// 設定がない場合のデフォルト値を設定
function setDefaultTimes() {
    // 現在時刻から入力フィールドのデフォルト値を設定
    const now = new Date();
    const defaultStart = new Date(now.getTime() + 15 * 60 * 1000); // 15分後
    const defaultEnd = new Date(now.getTime() + 75 * 60 * 1000);   // 1時間15分後

    startTimeInput.value = Time.formatTimeForInput(defaultStart);
    endTimeInput.value = Time.formatTimeForInput(defaultEnd);
}

// カスタムイベントのリスナー設定
function setupCustomEventListeners() {
    // 時間設定が更新されたときのイベントリスナー
    document.addEventListener('timeSettingsUpdated', function(e) {
        const settings = e.detail;
        openTime = settings.openTime;
        startTime = settings.startTime;
        endTime = settings.endTime;
        
        // カウントダウンを開始
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        startCountdown();
    });
}

// 時間入力フィールドの変更を検知し自動設定するための関数
function setupAutoTimeSettings() {
    const openTimeInput = document.getElementById('openTime');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    
    // 各入力フィールドのイベントリスナーを設定
    [openTimeInput, startTimeInput, endTimeInput].forEach(input => {
        if (!input) return;
        
        // フォーカスが外れたときに設定を自動適用
        input.addEventListener('blur', applyTimeSettings);
        
        // Enterキーが押されたときにも設定を自動適用
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // フォームの送信を防止
                applyTimeSettings();
                this.blur(); // フォーカスを外す
            }
        });
    });
}

// 時間設定を自動適用する関数
function applyTimeSettings() {
    const openTimeInput = document.getElementById('openTime');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const statusElem = document.getElementById('status');

    const openValue = openTimeInput.value;
    const startValue = startTimeInput.value;
    const endValue = endTimeInput.value;

    // 開演時間と終演時間は必須
    if (!startValue || !endValue) {
        statusElem.textContent = '開演時間と終演時間を入力してください';
        return;
    }

    // 使用する日付を決定する
    // 会場選択から選択した日付があればそれを使用し、なければ今日の日付を使用
    let targetDate = new Date();
    const selectedEventDate = document.body.dataset.selectedEventDate;
    
    if (selectedEventDate) {
        // 会場選択から選択した日付を使用
        targetDate = new Date(selectedEventDate);
        console.log(`会場選択から日付を使用: ${selectedEventDate}`);
    } else {
        console.log('今日の日付を使用します');
    }
    
    // 開場時間の設定（任意）
    let newOpenTime = null;
    if (openValue) {
        const [openHours, openMinutes] = openValue.split(':').map(Number);
        newOpenTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(),
            openHours, openMinutes);
    }
    
    const [startHours, startMinutes] = startValue.split(':').map(Number);
    const [endHours, endMinutes] = endValue.split(':').map(Number);

    const newStartTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(),
        startHours, startMinutes);
    const newEndTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(),
        endHours, endMinutes);

    // 開場時間と開演時間の整合性チェック
    if (newOpenTime && newOpenTime >= newStartTime) {
        statusElem.textContent = '警告: 開場時間が開演時間より後になっています';
        // 続行するが警告を表示
    }

    // 開演時間が終演時間より後の場合は、終演時間を翌日に設定
    if (newEndTime <= newStartTime) {
        // 自動的に翌日に設定
        newEndTime.setDate(newEndTime.getDate() + 1);
        statusElem.textContent = '終演時間が開演時間より前だったため、翌日に設定しました';
    }

    // 時間を設定
    openTime = newOpenTime;
    startTime = newStartTime;
    endTime = newEndTime;

    // 設定を保存
    Settings.saveSettings(openTime, startTime, endTime);
    
    // マニュアル設定として記録
    Settings.saveManualSettingInfo(targetDate);
    
    // 会場選択後の日付情報をクリア（マニュアル設定が完了したため）
    document.body.dataset.selectedEventDate = '';
    
    // カウントダウンをリセット
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    // 現在時刻との比較
    const now = new Date();
    const statusMessage = Settings.getStatusMessage(now, openTime, startTime, endTime);
    
    // ステータスメッセージ更新
    statusElem.textContent = `時間を設定しました: ${statusMessage}`;
    startCountdown();
}

// 初期化関数
function initialize() {
    // DOM要素を取得
    currentTimeElem = document.getElementById('currentTime');
    openCountdownCombinedElem = document.getElementById('openCountdownCombined');
    endCountdownCombinedElem = document.getElementById('endCountdownCombined');
    startCountdownCombinedElem = document.getElementById('startCountdownCombined');
    openTimeInput = document.getElementById('openTime');
    startTimeInput = document.getElementById('startTime');
    endTimeInput = document.getElementById('endTime');
    setTimesBtn = document.getElementById('setTimesBtn');
    resetBtn = document.getElementById('resetBtn');
    statusElem = document.getElementById('status');
    presetBtns = document.querySelectorAll('.preset-btn');

    // 1秒ごとに現在時刻を更新
    setInterval(updateCurrentTime, 1000);
    updateCurrentTime();

    // UI関連の設定
    UI.setupFullscreenToggle();
    UI.setupSettingsPanel();
    UI.setupEventTitle();
    UI.setupErrorHandlers();
    
    // ボタン関連の設定（時間設定ボタンは削除済み）
    // setupTimeButtons(); 
    setupResetButton();
    setupPresetButtons();
    setupPresetSelect();
    setupReloadPresetButton();
    
    // カスタムイベントリスナーの設定
    setupCustomEventListeners();
    setupAutoTimeSettings(); // 自動時間設定のセットアップ
    
    // applyTimeSettings関数をグローバルに公開
    window.applyTimeSettings = applyTimeSettings;
    
    // autoApplyTimeSettings イベントのリスナーを追加
    document.addEventListener('autoApplyTimeSettings', applyTimeSettings);

    // 保存された設定を読み込む
    if (!loadSavedSettings()) {
        setDefaultTimes();
    }

    // マニュアル設定の処理
    Settings.handleManualSettings(Events.loadEventData);
    
    // 会場検索機能の初期化
    Events.initVenueSearch();
}

// DOMContentLoaded イベントで初期化処理を実行
document.addEventListener('DOMContentLoaded', initialize);

// モジュールとしてエクスポート
export {
    initialize,
    updateCurrentTime,
    startCountdown,
    updateEventDateInfo
};