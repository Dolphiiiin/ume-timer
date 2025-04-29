// フルスクリーンボタンの処理を統一
document.getElementById('toggleFullscreen').addEventListener('click', function() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen();
    }
});

// フルスクリーン状態変更イベントリスナー
document.addEventListener('fullscreenchange', function() {
    const fullscreenBtn = document.getElementById('toggleFullscreen');
    if (fullscreenBtn) {
        if (document.fullscreenElement) {
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';  // 縮小アイコン
        } else {
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';    // 拡大アイコン
        }
    }
});

// グローバル変数
let openTime = null;
let startTime = null;
let endTime = null;
let countdownInterval = null;
const warningThreshold = 5 * 60 * 1000; // 5分
const dangerThreshold = 2 * 60 * 1000; // 2分
const EVENT_DURATION = 90; // 公演時間：1.5時間（90分）
// 設定の種類を記録するフラグ
let settingSource = 'auto'; // 'auto'：自動読み込み、'manual'：手動設定
let lastManualSettingDate = null; // 最後に手動設定した日付

// DOM要素
const currentTimeElem = document.getElementById('currentTime');
const openCountdownCombinedElem = document.getElementById('openCountdownCombined');
const endCountdownCombinedElem = document.getElementById('endCountdownCombined');
const startCountdownCombinedElem = document.getElementById('startCountdownCombined');
const openTimeInput = document.getElementById('openTime');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const setTimesBtn = document.getElementById('setTimesBtn');
const resetBtn = document.getElementById('resetBtn');
const statusElem = document.getElementById('status');
const presetBtns = document.querySelectorAll('.preset-btn');

// プリセットボタンのイベントリスナー
presetBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        const startTimeStr = this.getAttribute('data-start');
        const openTimeStr = this.getAttribute('data-open');
        
        // 反復処理の確認ダイアログを表示
        if (confirm('反復処理を続行しますか？')) {
            // プリセットを適用
            applyPreset(startTimeStr, openTimeStr);
        }
    });
});

// 現在時刻を表示する関数
function updateCurrentTime() {
    const now = new Date();
    // 現在時刻に日付情報を追加
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 月は0始まりなので+1
    const day = now.getDate();
    const formattedDate = `<span class="date-small">${padZero(month)}/${padZero(day)}</span>`;
    
    // 現在時刻の表示を更新（日付を含める）- MM/DD部分を秒数と同じスタイルにするが、フォントサイズを小さく
    currentTimeElem.innerHTML = `${formattedDate}${formatTime(now, true)}`;

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
                openCountdownCombinedElem.innerHTML = '<span class="time-label">開場 ' + formatTime(openTime, false) + '</span> <span class="time-value">00:00<span class="seconds">:00</span></span>';
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
                openCountdownCombinedElem.innerHTML = '<span class="time-label">開場 ' + formatTime(openTime, false) + ' まで</span> <span class="time-value">' + formatMilliseconds(timeToOpen) + '</span>';

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
            startCountdownCombinedElem.innerHTML = '<span class="time-label">開演 ' + formatTime(startTime, false) + '</span> <span class="time-value">00:00<span class="seconds">:00</span></span>';
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
            startCountdownCombinedElem.innerHTML = '<span class="time-label">開演 ' + formatTime(startTime, false) + ' まで</span> <span class="time-value">' + formatMilliseconds(timeToStart) + '</span>';

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
            endCountdownCombinedElem.innerHTML = '<span class="time-label">終演 ' + formatTime(endTime, false) + '</span> <span class="time-value">-' + formatMilliseconds(elapsedAfterEnd) + '</span>';
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
            endCountdownCombinedElem.innerHTML = '<span class="time-label">終演 ' + formatTime(endTime, false) + ' まで</span> <span class="time-value">' + formatMilliseconds(timeToEnd) + '</span>';

            // 残り時間に応じてカラーを変更
            if (timeToEnd <= dangerThreshold) {
                endCountdownCombinedElem.classList.remove('warning');
                endCountdownCombinedElem.classList.add('danger');
            } else if (timeToEnd <= warningThreshold) {
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
                statusElem.textContent = `開場まであと${formatTimeDifference(now, openTime)}`;
            } else {
                statusElem.textContent = `開演まであと${formatTimeDifference(now, startTime)}`;
            }
        }
    }
}        // カウントダウン更新間隔を設定
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
        eventDateElement.textContent = `${year}年${padZero(month)}月${padZero(day)}日(${dayOfWeek})`;
    } else {
        // 開演日時が設定されていない場合は現在の日付を表示
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()];
        
        eventDateElement.textContent = `${year}年${padZero(month)}月${padZero(day)}日(${dayOfWeek})`;
    }
}

// 時間を表示用にフォーマットする関数
function formatTime(date, includeSeconds = false) {
    const hours = padZero(date.getHours());
    const minutes = padZero(date.getMinutes());
    const seconds = padZero(date.getSeconds());

    if (includeSeconds) {
        return `${hours}:${minutes}<span class="seconds">:${seconds}</span>`;
    } else {
        return `${hours}:${minutes}`;
    }
}

// ミリ秒を時:分:秒形式にフォーマットする関数
function formatMilliseconds(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${padZero(hours)}:${padZero(minutes)}<span class="seconds">:${padZero(seconds)}</span>`;
}

// 時間差を「○時間○分○秒」形式でフォーマットする関数
function formatTimeDifference(start, end) {
    const diffMs = end - start;
    const diffSec = Math.floor(diffMs / 1000);
    const hours = Math.floor(diffSec / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);
    const seconds = diffSec % 60;

    let result = '';
    if (hours > 0) result += `${hours}時間`;
    if (minutes > 0 || hours > 0) result += `${minutes}分`;
    result += `${seconds}秒`;

    return result;
}

// ゼロパディングする関数
function padZero(num) {
    return num.toString().padStart(2, '0');
}        // フォントサイズ最適化関数の実行（CSSで制御するため無効化）
// フォントサイズを画面サイズに最適化する関数（CSSで制御するため無効化）

/*
function adjustFontSizes() {
    const timeDisplay = document.querySelector('.time-display');
    if (!timeDisplay) return;

    const displayWidth = timeDisplay.clientWidth;
    const displayHeight = timeDisplay.clientHeight;
    const windowWidth = window.innerWidth;

    // 現在時刻のフォントサイズ調整 - 画面幅を基準に
    const currentTime = document.getElementById('currentTime');
    if (currentTime) {
        // 画面幅の50%を超えないようにする
        const maxFontSize = Math.min(windowWidth * 0.5, displayHeight * 0.25);
        currentTime.style.fontSize = Math.max(1.8, maxFontSize / 16) + 'rem';
    }

    // カウントダウンエリアのサイズ取得
    const countdownAreas = document.querySelectorAll('.countdown-area');
    const countdownAreaHeight = displayHeight * 0.18; // 画面の18%を目安に

    // 統合されたカウントダウン表示のサイズ調整
    const combinedElements = document.querySelectorAll('.countdown-combined');
    combinedElements.forEach(element => {
        // 画面幅を基準にフォントサイズを決定 - 分母を小さくしてフォントサイズを大きく
        const maxSize = Math.min(windowWidth * 0.5, countdownAreaHeight * 0.7);
        element.style.fontSize = Math.max(1.2, maxSize / 20) + 'rem';

        // フレックスアイテムのサイズ調整
        const timeLabel = element.querySelector('.time-label');
        const timeValue = element.querySelector('.time-value');

        if (timeLabel && timeValue) {
            // 値の部分が必ず表示されるように、ラベル部分が縮小できるようにする
            timeLabel.style.flexBasis = 'auto';
            timeValue.style.flexShrink = '0';
            timeValue.style.flexBasis = 'auto';
        }
    });
}
*/

// リサイズイベントの連続発火を防ぐためのdebounce関数
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// 時間設定を保存する関数
function saveSettings() {
    if (startTime && endTime) {
        const settings = {
            openTime: openTime ? openTime.toISOString() : null,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString()
        };
        // cookieからlocalStorageに変更
        localStorage.setItem('timeSettings', JSON.stringify(settings));
    }
}

// 保存された設定を読み込む関数
function loadSettings() {
    // Cookieの代わりにlocalStorageから読み込む
    const settingsStr = localStorage.getItem('timeSettings');
    if (settingsStr) {
        try {
            const settings = JSON.parse(settingsStr);
            if (settings.openTime) {
                openTime = new Date(settings.openTime);
            }
            startTime = new Date(settings.startTime);
            endTime = new Date(settings.endTime);

            // 入力フィールドに値をセット
            if (openTime) {
                openTimeInput.value = formatTimeForInput(openTime);
            }
            startTimeInput.value = formatTimeForInput(startTime);
            endTimeInput.value = formatTimeForInput(endTime);

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
                statusElem.textContent = `開場まであと${formatTimeDifference(now, openTime)}`;
            } else {
                statusElem.textContent = `開演まであと${formatTimeDifference(now, startTime)}`;
            }

            return true;
        } catch (e) {
            console.error('設定の読み込みに失敗しました:', e);
        }
    }
    return false;
}

// Date オブジェクトを input[type="time"] 用にフォーマットする関数
function formatTimeForInput(date) {
    return `${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
}        

// 開演時間から終演時間を計算する関数
function calculateEndTime(startTimeStr) {
    const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
    let endHours = startHours;
    let endMinutes = startMinutes + EVENT_DURATION;
    
    // 分が60を超える場合は時間を調整
    if (endMinutes >= 60) {
        endHours += Math.floor(endMinutes / 60);
        endMinutes = endMinutes % 60;
    }
    
    // 24時間を超える場合は調整
    if (endHours >= 24) {
        endHours = endHours % 24;
    }
    
    // 終演時間をフォーマット
    const formattedEndHours = endHours.toString().padStart(2, '0');
    const formattedEndMinutes = endMinutes.toString().padStart(2, '0');
    return `${formattedEndHours}:${formattedEndMinutes}`;
}

// プリセットを選択したときの処理を関数化
function applyPreset(startTimeStr, openTimeStr) {
    // 開場時間と開演時間をセット
    openTimeInput.value = openTimeStr;
    startTimeInput.value = startTimeStr;
    
    // 終演時間を計算して設定
    endTimeInput.value = calculateEndTime(startTimeStr);
    
    // ステータス更新
    statusElem.textContent = `プリセット: 開演${startTimeStr}～（開場${openTimeStr}～）を設定しました。時間設定ボタンを押してタイマーをスタートしてください。`;
}

// 初期化関数
function initialize() {
    // 1秒ごとに現在時刻を更新
    setInterval(updateCurrentTime, 1000);
    updateCurrentTime();

    // フォントサイズ最適化関数の実行（CSSで制御するため無効化）
    /*
    adjustFontSizes();

    // ウィンドウリサイズ時の再調整（無効化）
    window.addEventListener('resize', debounce(adjustFontSizes, 200));

    // 画面の向き変更時の再調整（無効化）
    window.addEventListener('orientationchange', function() {
        setTimeout(adjustFontSizes, 200);
    });
    */

    // プリセット選択のイベントリスナー
    const presetSelect = document.getElementById('preset-select');
    if (presetSelect) {
        presetSelect.addEventListener('change', function() {
            if (this.value === '') return; // 何も選択されていない場合は何もしない
            
            const selectedOption = this.options[this.selectedIndex];
            const startTimeStr = selectedOption.getAttribute('data-start');
            const openTimeStr = selectedOption.getAttribute('data-open');
            
            // プリセットを適用
            applyPreset(startTimeStr, openTimeStr);
            
            // 選択をリセット（次回も同じプリセットを選べるように）
            setTimeout(() => {
                this.value = '';
            }, 100);
        });
    }
    
    // ヘッダーテキストの初期化と保存機能
    const headerText = document.getElementById('headerText');
    const eventTitleInput = document.getElementById('eventTitle');
    const savedHeader = localStorage.getItem('headerText');

    if (savedHeader) {
        eventTitleInput.value = savedHeader;

        // 都道府県のカッコの前に改行タグを挿入
        const headerTextWithBreak = savedHeader.replace(/（/g, '<br>（');
        headerText.innerHTML = headerTextWithBreak;
        
    }

    // イベントタイトル入力時の処理を強化
    eventTitleInput.addEventListener('input', function() {
        const newValue = this.value;
        localStorage.setItem('headerText', newValue);
        headerText.textContent = newValue;
        // タイトルも更新
        document.title = newValue || 'イベントタイムキーパー';
    });

    // イベントタイトル編集完了時の処理を追加（フォーカスが外れた時）
    eventTitleInput.addEventListener('blur', function() {
        const newValue = this.value;
        // 空のタイトルの場合はデフォルト値を設定
        if (!newValue.trim()) {
            this.value = 'イベントタイムキーパー';
            headerText.textContent = 'イベントタイムキーパー';
            document.title = 'イベントタイムキーパー';
            localStorage.setItem('headerText', 'イベントタイムキーパー');
        } else {
            // 入力内容が有効な場合は改めて保存（保険として）
            localStorage.setItem('headerText', newValue);
            headerText.textContent = newValue;
            document.title = newValue;
        }
    });

    // エンターキーでのフォーカス解除を追加
    eventTitleInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            this.blur(); // フォーカスを外す
        }
    });

    // 設定パネルの折りたたみ機能
    const settingsPanel = document.getElementById('settingsPanel');
    const toggleButton = document.getElementById('toggleSettings');
    const closeButton = document.getElementById('closeSettings');
    const settingsOverlay = document.getElementById('settingsOverlay');

    // 設定パネルを開く
    toggleButton.addEventListener('click', function() {
        settingsPanel.classList.remove('collapsed');
        settingsOverlay.classList.remove('collapsed');
        toggleButton.textContent = '≪';
        
        // メインコンテンツを左にずらす
        document.querySelector('.main-container').classList.add('with-settings');
        
        // トグルボタンを非表示にする（CSSの設定に加えて念のため）
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
    });

    // 設定パネルを閉じる（×ボタン）
    closeButton.addEventListener('click', function() {
        settingsPanel.classList.add('collapsed');
        settingsOverlay.classList.add('collapsed');
        toggleButton.textContent = '≫';
        
        // メインコンテンツを元の位置に戻す
        document.querySelector('.main-container').classList.remove('with-settings');
        
        // トグルボタンを表示する
        setTimeout(function() {
            toggleButton.style.opacity = '1';
            toggleButton.style.visibility = 'visible';
            toggleButton.style.pointerEvents = 'auto';
        }, 300); // トランジション完了後に表示（300ms）
    });

    // 背景クリックでも閉じる
    settingsOverlay.addEventListener('click', function() {
        settingsPanel.classList.add('collapsed');
        settingsOverlay.classList.add('collapsed');
        toggleButton.textContent = '≫';
        
        // メインコンテンツを元の位置に戻す
        document.querySelector('.main-container').classList.remove('with-settings');
        
        // トグルボタンを表示する
        setTimeout(function() {
            toggleButton.style.opacity = '1';
            toggleButton.style.visibility = 'visible';
            toggleButton.style.pointerEvents = 'auto';
        }, 300); // トランジション完了後に表示（300ms）
    });

    // 保存された設定を読み込む
    if (!loadSettings()) {
        // 現在時刻から入力フィールドのデフォルト値を設定
        const now = new Date();
        const defaultStart = new Date(now.getTime() + 15 * 60 * 1000); // 15分後
        const defaultEnd = new Date(now.getTime() + 75 * 60 * 1000);   // 1時間15分後

        startTimeInput.value = formatTimeForInput(defaultStart);
        endTimeInput.value = formatTimeForInput(defaultEnd);
    }

    // resetBtnのイベントリスナー設定（存在する場合のみ）
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
                localStorage.removeItem('timeSettings');
                
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

                startTimeInput.value = formatTimeForInput(defaultStart);
                endTimeInput.value = formatTimeForInput(defaultEnd);
            }
        });
    }

    // イベントリスナーの設定
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
        saveSettings();
        
        // マニュアル設定として記録
        settingSource = 'manual';
        // 日付をYYYY-MM-DD形式に変換（時間部分を含まない）
        const todayYear = targetDate.getFullYear();
        const todayMonth = (targetDate.getMonth() + 1).toString().padStart(2, '0');
        const todayDate = targetDate.getDate().toString().padStart(2, '0');
        const todayStr = `${todayYear}-${todayMonth}-${todayDate}`;
        lastManualSettingDate = todayStr;
        
        // ローカルストレージに保存
        localStorage.setItem('settingSource', 'manual');
        localStorage.setItem('manualSettingDate', todayStr);
        
        // 会場選択後の日付情報をクリア（マニュアル設定が完了したため）
        document.body.dataset.selectedEventDate = '';
        
        // ステータスメッセージに手動設定の情報を追加
        let statusMessage = "";

        // カウントダウンをリセット
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }

        // 現在時刻との比較
        const now = new Date();
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
        statusElem.textContent = statusMessage + "（手動設定済み）";
        startCountdown();
    });
}

// イベントCSVを読み込んで今日または次回のイベントを自動ロードする
function loadEventData() {
    fetch('events.csv')
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
            
            // 今日のイベントがあればそれを、なければ次のイベントをロード
            const eventToLoad = todayEvent || nextEvent;
            
            if (eventToLoad) {
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
    // ヘッダーテキストに「UME{地域} MM/DD」形式で設定
    const headerText = document.getElementById('headerText');
    const eventTitleInput = document.getElementById('eventTitle');
    
    // 日付をMM/DD形式に変換
    const eventDate = new Date(event.date);
    const month = eventDate.getMonth() + 1; // 月は0始まりなので+1
    const day = eventDate.getDate();
    const dateStr = `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
    
    // UME{地域} MM/DD 形式のタイトルを作成
    const title = `UME${event.region} ${dateStr}`;
    
    headerText.textContent = title;
    eventTitleInput.value = title;
    document.title = title;
    localStorage.setItem('headerText', title);
    
    // 時間をフォーム入力に設定
    document.getElementById('openTime').value = event.openTime.substring(0, 5); // HH:MM形式に変換
    document.getElementById('startTime').value = event.startTime.substring(0, 5);
    document.getElementById('endTime').value = event.endTime.substring(0, 5);
    
    // 開催日を表示
    const formattedDate = `${eventDate.getFullYear()}年${eventDate.getMonth() + 1}月${eventDate.getDate()}日`;
    
    // ステータス表示を更新
    let statusMsg = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (eventDate.getTime() === today.getTime()) {
        statusMsg = `本日(${formattedDate})のイベント情報をロードしました。`;
    } else {
        statusMsg = `次回(${formattedDate})のイベント情報をロードしました。`;
    }
    
    document.getElementById('status').textContent = statusMsg;
    
    // CSVから読み込んだ時間を自動的に設定し、カウントダウンを開始する
    autoSetTimes(event.date, event.openTime, event.startTime, event.endTime);
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
    openTime = newOpenTime;
    startTime = newStartTime;
    endTime = newEndTime;
    
    // 設定を保存
    saveSettings();
    
    // カウントダウンをリセット
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    
    // 現在時刻を取得
    const now = new Date();
    
    // 現在時刻との比較
    if (now >= endTime) {
        statusElem.textContent = "設定した終演時間は過ぎています";
    } else if (now >= startTime) {
        statusElem.textContent = "イベント進行中";
    } else if (now >= openTime) {
        statusElem.textContent = "開場中";
    } else {
        statusElem.textContent = `開場まであと${formatTimeDifference(now, openTime)}`;
    }
    
    // カウントダウン開始
    startCountdown();
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
    
    // フォームに値を設定
    document.getElementById('openTime').value = eventOpenTime.substring(0, 5);
    document.getElementById('startTime').value = eventStartTime.substring(0, 5);
    document.getElementById('endTime').value = eventEndTime.substring(0, 5);
    
    // イベントタイトルを設定（会場名と地域名を含める）
    const title = `${eventVenue}（${eventRegion}）`;
    document.getElementById('eventTitle').value = title;
    
    // 都道府県のカッコの前に改行タグを追加
    const formattedTitle = title.replace(/（/g, '<br>（');
    document.getElementById('headerText').innerHTML = formattedTitle;
    document.title = title;
    localStorage.setItem('headerText', title);
    
    // 選択した会場の日付情報をデータ属性として保存
    document.body.dataset.selectedEventDate = eventDate;
    
    // ステータス更新
    const formattedDate = formatDateForDisplay(eventDate);
    statusElem.textContent = `${formattedDate}の「${eventVenue}」の情報を設定しました。時間設定ボタンを押してタイマーをスタートしてください。`;
}

// 日付を表示用にフォーマットする関数
function formatDateForDisplay(dateStr) {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

// マニュアル設定を処理する関数
function handleManualSettings() {
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
            return loadEventData();
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
            return loadEventData();
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
    loadEventData();
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
            const incompleteEvents = []; // 必須データが不足しているイベント
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line || line.startsWith('//')) {
                    console.log(`スキップした行 ${i}: ${line.substring(0, 30)}...`);
                    continue; // 空行やコメント行はスキップ
                }
                
                const [date, region, venue, openTime, startTime, endTime] = line.split(',');
                
                // 基本データ（日付、地域、会場）がない行はスキップ
                if (!date || !region || !venue) {
                    console.log(`基本データ不足の行 ${i}: ${line}`);
                    continue;
                }
                
                const eventData = {
                    date: date,
                    region: region,
                    venue: venue,
                    openTime: openTime || '',
                    startTime: startTime || '',
                    endTime: endTime || ''
                };
                
                // 必須データ（開場、開演、終演時間）の有無でグループ分け
                if (!openTime || !startTime || !endTime) {
                    incompleteEvents.push(eventData);
                } else {
                    events.push(eventData);
                }
            }
            
            console.log(`完全なイベント数: ${events.length}, 不完全なイベント数: ${incompleteEvents.length}`);
            
            // 既存のオプションをクリア（最初のデフォルトオプションは保持）
            const defaultOption = venueSelect.options[0];
            venueSelect.innerHTML = '';
            venueSelect.appendChild(defaultOption);
            
            // 完全なイベントデータを追加
            events.forEach((event, index) => {
                const option = document.createElement('option');
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
            });
            
            // 不完全なイベントデータを追加（選択不可として）
            if (incompleteEvents.length > 0) {
                // セパレーターを追加
                const separator = document.createElement('option');
                separator.disabled = true;
                separator.textContent = '------- 時間未定のイベント -------';
                venueSelect.appendChild(separator);
                
                // 不完全なイベントを追加
                incompleteEvents.forEach((event) => {
                    const option = document.createElement('option');
                    const optionText = `${event.venue}（${event.region}） - ${formatDateForDisplay(event.date)}`;
                    option.value = optionText;
                    option.textContent = optionText;
                    option.disabled = true;
                    option.classList.add('incomplete-event');
                    
                    // データ属性にイベント情報を追加
                    option.dataset.date = event.date;
                    option.dataset.region = event.region;
                    option.dataset.venue = event.venue;
                    option.dataset.openTime = event.openTime;
                    option.dataset.startTime = event.startTime;
                    option.dataset.endTime = event.endTime;
                    
                    venueSelect.appendChild(option);
                });
            }
            
            // 会場選択のイベントリスナーを設定
            venueSelect.removeEventListener('change', handleVenueSelection);
            venueSelect.addEventListener('change', handleVenueSelection);
            console.log('会場選択のイベントリスナーを設定しました');
        })
        .catch(error => {
            console.error('会場データの読み込みエラー:', error);
        });
}

// DOMContentLoaded イベントで初期化処理を実行
document.addEventListener('DOMContentLoaded', function() {
    // ページの初期化
    initialize();
    
    // マニュアル設定の処理
    handleManualSettings();
    
    // 会場検索機能の初期化
    initVenueSearch();
    
    // プリセット再読み込みボタンの処理
    const reloadPresetBtn = document.getElementById('reloadPresetBtn');
    if (reloadPresetBtn) {
        reloadPresetBtn.addEventListener('click', function() {
            if (confirm('会場データを再読み込みしますか？')) {
                // 会場検索の初期化を再実行
                initVenueSearch();
                statusElem.textContent = "会場データを再読み込みしました";
            }
        });
    }
    
    // 拡張機能関連のエラーを抑制
    // runtime.lastError や message channel closed のエラーを無視
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
});        // 会場選択処理のハンドラー
function handleVenueSelection(event) {
    const selectedIndex = event.target.selectedIndex;
    if (selectedIndex === 0) return; // 最初のオプション（プレースホルダー）は無視
    
    const selectedOption = event.target.options[selectedIndex];
    // 選択されたオプションの情報を適用
    applyVenueSelection(selectedOption);
}
