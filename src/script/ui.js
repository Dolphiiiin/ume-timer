/**
 * ui.js - UI操作関連の機能
 */

import { formatTimeForInput, calculateEndTime } from './time.js';

// 設定画面の自動クローズタイマーを保持する変数
let settingsAutoCloseTimer = null;

// プリセットを選択したときの処理を関数化
function applyPreset(startTimeStr, openTimeStr) {
    const openTimeInput = document.getElementById('openTime');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const statusElem = document.getElementById('status');
    
    // 開場時間と開演時間をセット
    openTimeInput.value = openTimeStr;
    startTimeInput.value = startTimeStr;
    
    // 終演時間を計算して設定
    endTimeInput.value = calculateEndTime(startTimeStr);
    
    // ステータス更新
    statusElem.textContent = `プリセット: 開演${startTimeStr}～（開場${openTimeStr}～）を設定しました`;
    
    // 自動的に時間設定を適用
    setTimeout(() => {
        // core.jsのapplyTimeSettings関数を呼び出す
        // グローバルに設定されている関数を呼び出す
        if (typeof window.applyTimeSettings === 'function') {
            window.applyTimeSettings();
        } else {
            // 直接イベントをディスパッチして時間設定の適用をトリガー
            const event = new Event('autoApplyTimeSettings');
            document.dispatchEvent(event);
        }
    }, 100);
}

// フルスクリーン切り替え機能
function setupFullscreenToggle() {
    // フルスクリーンボタン
    document.getElementById('fullScreenBtn').addEventListener('click', function() {
        toggleFullscreen();
        // フルスクリーン切り替え時に設定画面も閉じる
        closeSettingsPanel();
    });
    document.getElementById('toggleFullscreen').addEventListener('click', function() {
        toggleFullscreen();
        // フルスクリーン切り替え時に設定画面も閉じる
        closeSettingsPanel();
    });
    
    // フルスクリーン状態変更イベントリスナー
    document.addEventListener('fullscreenchange', function() {
        // フルスクリーン状態のアイコン切り替えは行わないように変更
        // 一貫したインターフェースのためにアイコンは常に同じ状態を保持
    });
}

// フルスクリーン切り替え
function toggleFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen();
    }
}

// 設定パネルの切り替え機能をセットアップ
function setupSettingsPanel() {
    const settingsPanel = document.getElementById('settingsPanel');
    const toggleButton = document.getElementById('toggleSettings');
    const closeButton = document.getElementById('closeSettings');
    const settingsOverlay = document.getElementById('settingsOverlay');

    if (!settingsPanel || !toggleButton || !closeButton || !settingsOverlay) {
        console.error('設定パネル関連の要素が見つかりません');
        return;
    }

    // 設定パネルを開く
    toggleButton.addEventListener('click', function() {
        // 念のため、設定パネルを開く前に既存のタイマーをクリア
        clearSettingsAutoCloseTimer();
        
        settingsPanel.classList.remove('collapsed');
        settingsOverlay.classList.remove('collapsed');
        toggleButton.textContent = '≪';
        
        // メインコンテンツを左にずらす
        document.querySelector('.main-container').classList.add('with-settings');
        
        // トグルボタンを非表示にする
        toggleButton.style.opacity = '0';
        toggleButton.style.visibility = 'hidden';
        toggleButton.style.pointerEvents = 'none';
        
        // フルスクリーンボタンも非表示にする
        const fullscreenBtn = document.getElementById('toggleFullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.style.opacity = '0';
            fullscreenBtn.style.visibility = 'hidden';
            fullscreenBtn.style.pointerEvents = 'none';
        }
        
        // 自動クローズタイマーを設定（1分後に自動的に閉じる）
        startSettingsAutoCloseTimer();
    });

    // 設定パネルを閉じる（×ボタン）
    closeButton.addEventListener('click', closeSettingsPanel);

    // 背景クリックでも閉じる
    settingsOverlay.addEventListener('click', closeSettingsPanel);
    
    // 設定パネル内のユーザー操作を検知して自動クローズタイマーをリセット
    settingsPanel.addEventListener('click', resetSettingsAutoCloseTimer);
    settingsPanel.addEventListener('input', resetSettingsAutoCloseTimer);
    settingsPanel.addEventListener('change', resetSettingsAutoCloseTimer);
    settingsPanel.addEventListener('scroll', resetSettingsAutoCloseTimer);
}

// 設定パネルの自動クローズタイマーを開始
function startSettingsAutoCloseTimer() {
    // 既存のタイマーがあればクリア
    clearSettingsAutoCloseTimer();
    
    // 1分(60000ミリ秒)後に自動的に設定パネルを閉じる
    settingsAutoCloseTimer = setTimeout(function() {
        console.log('1分間操作がなかったため、設定パネルを自動的に閉じます');
        closeSettingsPanel();
    }, 60000);
    
    console.log('設定パネルの自動クローズタイマーを開始しました');
}

// 設定パネルの自動クローズタイマーをリセット
function resetSettingsAutoCloseTimer() {
    // 既存のタイマーをクリアして新しいタイマーを開始
    clearSettingsAutoCloseTimer();
    startSettingsAutoCloseTimer();
}

// 設定パネルの自動クローズタイマーをクリア
function clearSettingsAutoCloseTimer() {
    if (settingsAutoCloseTimer !== null) {
        clearTimeout(settingsAutoCloseTimer);
        settingsAutoCloseTimer = null;
        console.log('設定パネルの自動クローズタイマーをクリアしました');
    }
}

// 設定パネルを閉じる
function closeSettingsPanel() {
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsOverlay = document.getElementById('settingsOverlay');
    const toggleButton = document.getElementById('toggleSettings');
    
    settingsPanel.classList.add('collapsed');
    settingsOverlay.classList.add('collapsed');
    toggleButton.textContent = '≫';
    
    // メインコンテンツを元の位置に戻す
    document.querySelector('.main-container').classList.remove('with-settings');
    
    // 自動クローズタイマーをクリア
    clearSettingsAutoCloseTimer();
    
    // トグルボタンとフルスクリーンボタンを表示する
    setTimeout(function() {
        // トグルボタンを表示
        toggleButton.style.opacity = '1';
        toggleButton.style.visibility = 'visible';
        toggleButton.style.pointerEvents = 'auto';
        
        // フルスクリーンボタンも表示
        const fullscreenBtn = document.getElementById('toggleFullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.style.opacity = '1';
            fullscreenBtn.style.visibility = 'visible';
            fullscreenBtn.style.pointerEvents = 'auto';
        }
    }, 300); // トランジション完了後に表示（300ms）
}

// イベントタイトル関連機能のセットアップ
function setupEventTitle() {
    const headerText = document.getElementById('headerText');
    const eventTitleInput = document.getElementById('eventTitle');
    
    if (!headerText || !eventTitleInput) {
        console.error('イベントタイトル関連の要素が見つかりません');
        return;
    }
    
    const savedHeader = localStorage.getItem('headerText');

    if (savedHeader) {
        eventTitleInput.value = savedHeader;

        // 都道府県のカッコの前に改行タグを挿入
        const headerTextWithBreak = savedHeader.replace(/（/g, '<br>（');
        headerText.innerHTML = headerTextWithBreak;
    }

    // イベントタイトル入力時の処理
    eventTitleInput.addEventListener('input', function() {
        const newValue = this.value;
        localStorage.setItem('headerText', newValue);
        headerText.textContent = newValue;
        // タイトルも更新
        document.title = newValue || 'イベントタイムキーパー';
    });

    // イベントタイトル編集完了時の処理（フォーカスが外れた時）
    eventTitleInput.addEventListener('blur', function() {
        const newValue = this.value;
        // 空のタイトルの場合はデフォルト値を設定
        if (!newValue.trim()) {
            this.value = 'イベントタイムキーパー';
            headerText.textContent = 'イベントタイムキーパー';
            document.title = 'イベントタイムキーパー';
            localStorage.setItem('headerText', 'イベントタイムキーパー');
        } else {
            // 入力内容が有効な場合は改めて保存
            localStorage.setItem('headerText', newValue);
            headerText.textContent = newValue;
            document.title = newValue;
        }
    });

    // エンターキーでのフォーカス解除
    eventTitleInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            this.blur(); // フォーカスを外す
        }
    });
}

// エラー処理関連の設定
function setupErrorHandlers() {
    // 拡張機能関連のエラーを抑制
    window.addEventListener('error', function(event) {
        // 拡張機能関連のエラーメッセージをチェック
        if (event.message && (
            event.message.includes('runtime.lastError') || 
            event.message.includes('message channel closed')
        )) {
            // これらのエラーは無視する（ブラウザ拡張機能に関連する問題）
            event.preventDefault();
            return true;
        }
    });
    
    // Promiseのエラーも同様に処理
    window.addEventListener('unhandledrejection', function(event) {
        if (event.reason && event.reason.message && (
            event.reason.message.includes('runtime.lastError') || 
            event.reason.message.includes('message channel closed')
        )) {
            // Promiseのエラーも無視
            event.preventDefault();
            return true;
        }
    });
}

// モジュールとしてエクスポート
export {
    applyPreset,
    setupFullscreenToggle,
    toggleFullscreen,
    setupSettingsPanel,
    closeSettingsPanel,
    setupEventTitle,
    setupErrorHandlers
};