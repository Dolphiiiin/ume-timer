// フルスクリーン
document.getElementById('fullScreenBtn').addEventListener('click', function() {
    if (document.fullscSreenElement) {
        document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen();
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
            // 開場時間と開演時間をセット
            openTimeInput.value = openTimeStr;
            startTimeInput.value = startTimeStr;
            
            // 終演時間を計算（開演時間 + 1.5時間）
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
            endTimeInput.value = `${formattedEndHours}:${formattedEndMinutes}`;
            
            // ステータス更新
            statusElem.textContent = `プリセット: 開演${startTimeStr}～（開場${openTimeStr}～）を設定しました。時間設定ボタンを押してタイマーをスタートしてください。`;
        }
    });
});

// 現在時刻を表示する関数
function updateCurrentTime() {
    const now = new Date();
    currentTimeElem.innerHTML = formatTime(now, true);

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
            // 終演後は 00:00:00 を表示
            endCountdownCombinedElem.innerHTML = '<span class="time-label">終演 ' + formatTime(endTime, false) + '</span> <span class="time-value">00:00<span class="seconds">:00</span></span>';
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
}// 時間を表示用にフォーマットする関数
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
}        // フォントサイズを画面サイズに最適化する関数
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
        document.cookie = `timeSettings=${JSON.stringify(settings)}; expires=${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString()}; path=/`;
    }
}

// 保存された設定を読み込む関数
function loadSettings() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'timeSettings') {
            try {
                const settings = JSON.parse(value);
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
    }
    return false;
}

// Date オブジェクトを input[type="time"] 用にフォーマットする関数
function formatTimeForInput(date) {
    return `${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
}        // 初期化関数
function initialize() {
    // 1秒ごとに現在時刻を更新
    setInterval(updateCurrentTime, 1000);
    updateCurrentTime();

    // フォントサイズ最適化関数を実行
    adjustFontSizes();

    // ウィンドウリサイズ時にフォントサイズを再調整
    window.addEventListener('resize', debounce(adjustFontSizes, 200));

    // 画面の向きが変わった時にもフォントサイズを再調整
    window.addEventListener('orientationchange', function() {
        setTimeout(adjustFontSizes, 200);
    });
    
    // プリセット選択のイベントリスナー
    const presetSelect = document.getElementById('preset-select');
    if (presetSelect) {
        presetSelect.addEventListener('change', function() {
            if (this.value === '') return; // 何も選択されていない場合は何もしない
            
            const selectedOption = this.options[this.selectedIndex];
            const startTimeStr = selectedOption.getAttribute('data-start');
            const openTimeStr = selectedOption.getAttribute('data-open');
            
            // 開場時間と開演時間をセット
            openTimeInput.value = openTimeStr;
            startTimeInput.value = startTimeStr;
            
            // 終演時間を計算（開演時間 + 1.5時間）
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
            endTimeInput.value = `${formattedEndHours}:${formattedEndMinutes}`;
            
            // ステータス更新
            statusElem.textContent = `プリセット: 開演${startTimeStr}～（開場${openTimeStr}～）を設定しました。時間設定ボタンを押してタイマーをスタートしてください。`;
            
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
        headerText.value = savedHeader;
        eventTitleInput.value = savedHeader;
    }

    // ヘッダーテキスト変更時の処理
    headerText.addEventListener('input', function() {
        const newValue = this.value;
        localStorage.setItem('headerText', newValue);
        eventTitleInput.value = newValue;
        // タイトルも更新
        document.title = newValue || 'イベントタイムキーパー';
    });

    // イベントタイトル入力時の処理
    eventTitleInput.addEventListener('input', function() {
        const newValue = this.value;
        localStorage.setItem('headerText', newValue);
        headerText.value = newValue;
        // タイトルも更新
        document.title = newValue || 'イベントタイムキーパー';
    });
    // 設定パネルの折りたたみ機能
    const settingsPanel = document.getElementById('settingsPanel');
    const toggleButton = document.getElementById('toggleSettings');

    toggleButton.addEventListener('click', function() {
        settingsPanel.classList.toggle('collapsed');
        toggleButton.classList.toggle('collapsed');
        toggleButton.textContent = settingsPanel.classList.contains('collapsed') ? '≪' : '≫';
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

    // イベントリスナーの設定
    setTimesBtn.addEventListener('click', function() {
        const openValue = openTimeInput.value;
        const startValue = startTimeInput.value;
        const endValue = endTimeInput.value;

        if (!startValue || !endValue) {
            alert('開演時間と終演時間は必須です');
            return;
        }

        // 今日の日付を使用して日時を作成
        const today = new Date();
        
        // 開場時間の設定（任意）
        let newOpenTime = null;
        if (openValue) {
            const [openHours, openMinutes] = openValue.split(':').map(Number);
            newOpenTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(),
                openHours, openMinutes);
        }
        
        const [startHours, startMinutes] = startValue.split(':').map(Number);
        const [endHours, endMinutes] = endValue.split(':').map(Number);

        const newStartTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(),
            startHours, startMinutes);
        const newEndTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(),
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

        // カウントダウンをリセット
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }

        // 現在時刻との比較
        const now = new Date();
        if (now >= endTime) {
            statusElem.textContent = "設定した終演時間は過ぎています";
            startCountdown();
        } else if (now >= startTime) {
            statusElem.textContent = "イベント進行中";
            startCountdown();
        } else if (openTime && now >= openTime) {
            statusElem.textContent = "開場中";
            startCountdown();
        } else if (openTime) {
            statusElem.textContent = `開場まであと${formatTimeDifference(now, openTime)}`;
            startCountdown();
        } else {
            statusElem.textContent = `開演まであと${formatTimeDifference(now, startTime)}`;
            startCountdown();
        }
    });

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

            // クッキーを削除
            document.cookie = 'timeSettings=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            
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

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', initialize);
