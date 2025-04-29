/**
 * time.js - 時間表示・計算関連の機能
 */

// 時間関連の定数
const warningThreshold = 5 * 60 * 1000; // 5分
const dangerThreshold = 2 * 60 * 1000; // 2分
const EVENT_DURATION = 90; // 公演時間：1.5時間（90分）

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

// 日付を表示用にフォーマットする関数
function formatDateForDisplay(dateStr) {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
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

// モジュールとしてエクスポート
export {
    warningThreshold,
    dangerThreshold,
    EVENT_DURATION,
    formatTime,
    formatMilliseconds,
    formatTimeDifference,
    padZero,
    formatTimeForInput,
    calculateEndTime,
    formatDateForDisplay,
    debounce
};