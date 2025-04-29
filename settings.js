/**
 * settings.js - 設定の保存と読み込み
 */

import { formatTimeForInput, formatTimeDifference } from './time.js';

// 時間設定を保存する関数
function saveSettings(openTime, startTime, endTime) {
    if (startTime && endTime) {
        const settings = {
            openTime: openTime ? openTime.toISOString() : null,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString()
        };
        // localStorageに保存
        localStorage.setItem('timeSettings', JSON.stringify(settings));
    }
}

// 保存された設定を読み込む関数
function loadSettings() {
    // localStorageから読み込む
    const settingsStr = localStorage.getItem('timeSettings');
    if (settingsStr) {
        try {
            const settings = JSON.parse(settingsStr);
            const result = {
                openTime: settings.openTime ? new Date(settings.openTime) : null,
                startTime: new Date(settings.startTime),
                endTime: new Date(settings.endTime)
            };

            return result;
        } catch (e) {
            console.error('設定の読み込みに失敗しました:', e);
        }
    }
    return null;
}

// 設定の種類を記録するフラグを管理
let settingSource = 'auto'; // 'auto'：自動読み込み、'manual'：手動設定
let lastManualSettingDate = null; // 最後に手動設定した日付

// マニュアル設定を処理する関数
function handleManualSettings(loadEventDataCallback) {
    // 設定の種類と最後のマニュアル設定日を取得
    const savedSettingSource = localStorage.getItem('settingSource');
    const savedManualSettingDate = localStorage.getItem('manualSettingDate');
    
    // 前回の時間設定を取得
    const timeSettingsStr = localStorage.getItem('timeSettings');
    let previousEventDate = null;
    
    if (timeSettingsStr) {
        try {
            const settings = JSON.parse(timeSettingsStr);
            if (settings.startTime) {
                // 開演時間から日付部分のみを取得
                const startTimeDate = new Date(settings.startTime);
                previousEventDate = new Date(
                    startTimeDate.getFullYear(),
                    startTimeDate.getMonth(),
                    startTimeDate.getDate()
                );
            }
        } catch (e) {
            console.error('前回の設定の解析に失敗しました:', e);
        }
    }
    
    // 現在の日付を取得（yyyy-MM-dd形式）
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    today.setHours(0, 0, 0, 0); // 時間部分をリセット
    
    // 1. 日付が変わった場合（前回の設定日が今日でない場合）
    if (savedManualSettingDate && savedManualSettingDate !== todayStr) {
        console.log('日付が変わりました。古い設定情報をクリアするか確認します。');
        
        // 日付が変わった場合、ユーザーに確認
        if (confirm('日付が変わりました。今日(' + todayStr + ')のイベント情報を自動的に読み込みますか？\n「キャンセル」を選択すると、前回(' + savedManualSettingDate + ')の設定を引き続き使用できます。')) {
            // OKが選択された場合は設定をクリア
            localStorage.removeItem('timeSettings');
            localStorage.removeItem('settingSource');
            localStorage.removeItem('manualSettingDate');
            settingSource = 'auto';
            lastManualSettingDate = null;
            
            // マニュアル設定をクリアしたので、イベントCSVを読み込む
            return loadEventDataCallback();
        } else {
            // キャンセルが選択された場合は前回の設定を維持
            console.log('ユーザーが前回の設定を維持することを選択しました');
            settingSource = 'manual';
            lastManualSettingDate = savedManualSettingDate;
            return;
        }
    }
    // 2. 前回のイベント日付が今日より前の場合（イベントが過去のものになった場合）
    else if (previousEventDate && previousEventDate < today) {
        console.log('前回設定したイベントの日付が過去のものです。新しいイベント情報をロードするか確認します。');
        
        // 前回のイベント日付をフォーマット
        const prevDateStr = `${previousEventDate.getFullYear()}年${previousEventDate.getMonth() + 1}月${previousEventDate.getDate()}日`;
        
        // ユーザーに確認
        if (confirm(`前回設定されたイベント(${prevDateStr})は過去のものです。\n新しいイベント情報を読み込みますか？\n「キャンセル」を選択すると、前回の設定を引き続き使用できます。`)) {
            // OKが選択された場合は設定をクリア
            localStorage.removeItem('timeSettings');
            localStorage.removeItem('settingSource');
            localStorage.removeItem('manualSettingDate');
            settingSource = 'auto';
            lastManualSettingDate = null;
            
            // 設定をクリアしたので、新しいイベントCSVを読み込む
            return loadEventDataCallback();
        } else {
            // キャンセルが選択された場合は前回の設定を維持
            console.log('ユーザーが前回の設定を維持することを選択しました');
            settingSource = 'manual';
            return;
        }
    }
    
    if (savedSettingSource === 'manual' && savedManualSettingDate) {
        // 保存されているマニュアル設定日が今日であれば、マニュアル設定を優先
        if (savedManualSettingDate === todayStr) {
            settingSource = 'manual';
            lastManualSettingDate = savedManualSettingDate;
            console.log('マニュアル設定を継続使用（設定日: ' + lastManualSettingDate + '）');
            return; // マニュアル設定優先の場合はイベントCSVを読み込まない
        } else {
            console.log('マニュアル設定日(' + savedManualSettingDate + ')が今日(' + todayStr + ')ではないため、プリセットを読み込みます');
            // 古いマニュアル設定情報をクリア
            localStorage.removeItem('settingSource');
            localStorage.removeItem('manualSettingDate');
            settingSource = 'auto';
            lastManualSettingDate = null;
        }
    }
    
    // マニュアル設定が優先でない場合、イベントCSVを読み込む
    loadEventDataCallback();
}

// ユーザー設定を保存
function saveManualSettingInfo(date) {
    // マニュアル設定として記録
    settingSource = 'manual';
    
    // 日付をYYYY-MM-DD形式に変換（時間部分を含まない）
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    lastManualSettingDate = dateStr;
    
    // ローカルストレージに保存
    localStorage.setItem('settingSource', 'manual');
    localStorage.setItem('manualSettingDate', dateStr);
}

// 設定をリセットする
function resetSettings() {
    localStorage.removeItem('timeSettings');
    localStorage.removeItem('settingSource');
    localStorage.removeItem('manualSettingDate');
    settingSource = 'auto';
    lastManualSettingDate = null;
}

// 現在のステータスに基づくメッセージを生成
function getStatusMessage(now, openTime, startTime, endTime, isManualSetting = false) {
    let statusMessage = "";
    
    if (now >= endTime) {
        statusMessage = "設定した終演時間は過ぎています";
    } else if (now >= startTime) {
        statusMessage = "イベント進行中";
    } else if (openTime && now >= openTime) {
        statusMessage = "開場中";
    } else if (openTime) {
        statusMessage = `開場まであと${formatTimeDifference(now, openTime)}`;
    } else {
        statusMessage = `開演まであと${formatTimeDifference(now, startTime)}`;
    }
    
    // マニュアル設定であることを明示
    if (isManualSetting) {
        statusMessage += "（手動設定済み）";
    }
    
    return statusMessage;
}

// モジュールとしてエクスポート
export {
    saveSettings,
    loadSettings,
    handleManualSettings,
    saveManualSettingInfo,
    resetSettings,
    getStatusMessage,
    settingSource,
    lastManualSettingDate
};