// ===============================================
// 1. HTML要素の取得と変数定義
// ===============================================
const colorWheelCanvas = document.getElementById('color-wheel');
const ctx = colorWheelCanvas.getContext('2d');
const analyzeButton = document.getElementById('analyze-button');
const keywordsInput = document.getElementById('keywords');
const moodResultDisplay = document.getElementById('mood-result');
const playButton = document.getElementById('play-button');
const trackTitleDisplay = document.getElementById('track-title');

// ★追加：親要素（.player-controls）を取得
const playerControls = playButton.closest('.player-controls');

// ★追加：オーディオ波形コンテナを取得
const waveContainer = document.querySelector('.audio-wave-container'); 
let animationInterval; // アニメーションIDを保持する変数

let selectedHsl = { h: 0, s: 0, l: 0 }; 

const audioPlayer = document.getElementById('audio-player-element'); 
audioPlayer.muted = false; 

const colorWheel = document.getElementById('color-wheel'); 
const colorWheelContainer = document.getElementById('color-wheel-container'); 

const size = 200;
colorWheelCanvas.width = size;
colorWheelCanvas.height = size;
const center = size / 2;
const radius = size / 2;

// ===============================================
// 2. 音楽データリスト（外部URL版）
// ===============================================
const musicDatabase = [
    // 外部URLを使用します。
    { title: "Quiet Raindrops (Ambient)", mood: ["静寂", "雨", "ピアノ", "落ち着いた", "スロー", "インストゥルメンタル", "アンビエント", "リラックス", "癒やし", "冬"], genre: "Ambient/Piano", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { title: "Summer Day Pop (Upbeat)", mood: ["明るい", "太陽", "アップテンポ", "軽快", "楽しい", "情熱的な", "ポップ", "運動", "爽快", "夏"], genre: "Pop", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { title: "Midnight Coffee Jazz (Bossa)", mood: ["落ち着いた", "コーヒー", "洗練", "スローテンポ", "知的な", "ジャズ", "ボサノバ", "仕事", "秋", "リラックス"], genre: "Jazz/Bossa Nova", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { title: "Neon Future Beat (Electro)", mood: ["ハイテンポ", "エネルギッシュ", "シンセサイザー", "力強い", "情熱的な", "ロック", "エレクトロ", "kpop", "ドライブ"], genre: "Electro/KPOP", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
    { title: "Zen Garden Flute (Healing)", mood: ["安らぎ", "静寂", "インスト", "爽やか", "癒やし", "スロー", "春", "リラックス"], genre: "Healing/Instrumental", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
    { title: "Heavy Metal Night (Rock)", mood: ["重厚感", "シリアスな", "情熱的な", "ロック", "エレクトロ", "力強い", "冬", "運動"], genre: "Rock/Metal", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" }
];


// ===============================================
// 3-6. 描画・変換・分析・検索ロジック 
// ===============================================
function drawColorWheel() {
    const gradient = ctx.createConicGradient(0, center, center);
    for (let i = 0; i <= 360; i++) { gradient.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`); }
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
    const innerGradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
    innerGradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); 
    innerGradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');     
    ctx.fillStyle = innerGradient;
    ctx.fill();
}
drawColorWheel(); 

function rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; } 
    else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100) / 100, l: Math.round(l * 100) / 100 };
}

function analyzeMood(hslData, keywords) {
    let moodH = '';
    const h = hslData.h;
    if (h >= 330 || h < 30) { moodH = '情熱的な'; }
    else if (h >= 30 && h < 90) { moodH = '明るい、楽しい'; }
    else if (h >= 90 && h < 150) { moodH = '安らぎのある'; }
    else if (h >= 150 && h < 210) { moodH = '爽やかで静かな'; }
    else if (h >= 210 && h < 270) { moodH = '落ち着いた、知的な'; }
    else { moodH = '神秘的な'; }

    let energySL = '';
    const s = hslData.s; 
    const l = hslData.l; 
    if (s > 0.7 && l > 0.5) { energySL = 'ハイテンポで力強い'; } 
    else if (s < 0.2) { energySL = '静寂で、テンポが遅い'; } 
    else if (l < 0.3) { energySL = '重厚感のある、シリアスな'; } 
    else { energySL = '中テンポで軽快な'; }

    let influenceList = [];
    const keywordArray = keywords.toLowerCase().split(/[, ]+/).filter(k => k.length > 0);
    keywordArray.forEach(kw => {
        if (kw === '勉強' || kw === '集中' || kw === '仕事') { influenceList.push('歌詞のないインストゥルメンタル構成'); } 
        else if (kw === 'リラックス' || kw === '癒やし' || kw === 'ヒーリング') { influenceList.push('環境音（アンビエント）とゆったりとしたテンポ'); } 
        else if (kw === '運動' || kw === 'ドライブ' || kw === '爽快') { influenceList.push('強いリズムとシンセまたはギターリフ'); } 
        else if (kw === '睡眠' || kw === '寝る') { influenceList.push('ホワイトノイズや静かなドローン音'); } 
        else if (kw === '悲しい' || kw === '切ない') { influenceList.push('マイナーコード進行とストリングス（弦楽器）の強調'); } 
        else if (kw === '楽しい' || kw === 'ハッピー') { influenceList.push('メジャーコード進行と軽快なパーカッション'); } 
        else if (kw === '雨') { influenceList.push('しっとりとしたピアノの音色とリバーブ'); } 
        else if (kw === 'コーヒー' || kw === 'カフェ') { influenceList.push('洗練されたジャズまたはボサノバ風のサウンド'); } 
        else if (kw === 'チル') { influenceList.push('メロディよりムードを重視したスローテンポ'); } 
        else if (kw === '太陽') { influenceList.push('開放感のあるアップテンポとホーン（管楽器）の使用'); } 
        else if (kw === '月') { influenceList.push('神秘的なコードとミニマルなアレンジ'); } 
        else if (kw === 'kpop' || kw === 'jpop' || kw === '洋楽') { influenceList.push('強いビートとシンセサイザーを強調'); } 
        else if (kw === '春') { influenceList.push('明るく透明感のある音色と中〜高テンポ'); } 
        else if (kw === '夏') { influenceList.push('開放感と強いビート、マリンバの使用'); } 
        else if (kw === '秋') { influenceList.push('落ち着いたトーンのギターと少しノスタルジックなメロディ'); } 
        else if (kw === '冬') { influenceList.push('深く冷たいシンセパッドと低音域の強調'); }
    });
    
    let keywordInfluence = '';
    if (influenceList.length > 0) {
        keywordInfluence = `特徴として、${influenceList.join('、')}を伴う`;
    }

    let primaryGenre = 'インストゥルメンタル';
    if (keywordArray.includes('kpop') || keywordArray.includes('jpop') || keywordArray.includes('洋楽')) {
        primaryGenre = keywordArray.find(k => k.includes('pop') || k.includes('洋楽')).toUpperCase();
    } else if (keywordArray.includes('コーヒー')) {
        primaryGenre = 'ボサノバ/ジャズ';
    } else if (h >= 330 || h < 30) { 
        primaryGenre = 'ロックまたはエレクトロ';
    } else if (h >= 210 && h < 270) { 
        primaryGenre = 'アンビエントまたはクラシック';
    }
    
    return `${energySL} ${moodH} ${keywordInfluence} ${primaryGenre}音楽を提案します。`;
}

function searchTrack(moodDescription, hslData) { 
    const searchTerms = moodDescription.toLowerCase().split(/[, ]+/).filter(t => t.length > 2);
    let bestMatch = null;
    let highestScore = -1;

    musicDatabase.forEach(track => {
        let score = 0;
        const trackKeywords = (track.title + ' ' + track.genre + ' ' + track.mood.join(' ')).toLowerCase();
        searchTerms.forEach(term => {
            if (trackKeywords.includes(term)) { score++; }
        });
        if (score > highestScore) {
            highestScore = score;
            bestMatch = track;
        }
    });

    if (highestScore <= 1 || !bestMatch) { 
        console.log("フォールバック処理: 色相に基づいて曲を提案します。");
        let fallbackMood = '';
        const h = hslData.h;
        if (h >= 330 || h < 30) { fallbackMood = '情熱的な'; }
        else if (h >= 30 && h < 90) { fallbackMood = '明るい'; }
        else if (h >= 90 && h < 150) { fallbackMood = '安らぎ'; }
        else if (h >= 150 && h < 210) { fallbackMood = '爽やか'; }
        else if (h >= 210 && h < 270) { fallbackMood = '落ち着いた'; }
        else { fallbackMood = '神秘的な'; }

        return musicDatabase.find(track => track.mood.includes(fallbackMood)) || musicDatabase[0];
    }
    return bestMatch;
}


// ===============================================
// 7. イベントリスナー（色選択）
// ===============================================
colorWheelCanvas.addEventListener('click', (event) => {
    const rect = colorWheelCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hsl = rgbToHsl(pixel[0], pixel[1], pixel[2]);
    selectedHsl = hsl; 
    const hslColor = `hsl(${hsl.h}, ${hsl.s*100}%, ${hsl.l*100}%)`;
    colorWheel.style.setProperty('--selected-color', hslColor);
    colorWheel.classList.add('selected'); 
    console.log(`選択された色: HSL(${hsl.h}°, ${hsl.s*100}%, ${hsl.l*100}%)`);
});


// ===============================================
// 8. イベントリスナー（ムード分析）
// ===============================================
analyzeButton.addEventListener('click', () => {
    if (selectedHsl.h === 0 && selectedHsl.s === 0 && selectedHsl.l === 0) {
        alert("まずカラーホイールをクリックして色を選択してください！");
        return;
    }
    const colorData = selectedHsl; 
    const keywordText = keywordsInput.value.trim();
    const musicMoodDescription = analyzeMood(colorData, keywordText); 
    const suggestedTrack = searchTrack(musicMoodDescription, colorData);
    const trackMoodTags = suggestedTrack.mood.join(', ');
    const finalMoodDisplay = `色とキーワードから導かれた要素に基づき、以下の特徴を持つ音楽を提案します。\n\n[提案された楽曲の特徴]: ${trackMoodTags} (${suggestedTrack.genre})`;
    moodResultDisplay.textContent = finalMoodDisplay;
    trackTitleDisplay.textContent = `曲名: ${suggestedTrack.title}`;
    playButton.dataset.trackUrl = suggestedTrack.url; 
    const hslColor = `hsl(${selectedHsl.h}, ${selectedHsl.s*100}%, ${selectedHsl.l*100}%)`;
    colorWheel.style.setProperty('--selected-color', hslColor);
    colorWheel.classList.add('selected');
});


// ===============================================
// 9. イベントリスナー（再生ボタン）
// ===============================================

// ★★★ JSアニメーションロジックの最終修正版（右から左へ） ★★★
let backgroundPositionX = 0;
let waveSpeed = 0.5; // 移動速度 (ピクセル/フレーム)
const maxOffset = 100; // グラデーションの最大移動幅 (background-size: 200%に対応)

function startWaveAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval); 
    }

    // 初期化
    backgroundPositionX = 100; // ★修正: 右端からスタート
    waveSpeed = -0.5; // ★修正: 左向き (マイナス) でスタート

    animationInterval = setInterval(() => {
        // 現在位置を更新
        backgroundPositionX += waveSpeed;

        // ★修正済み: 左端(0)に到達したら、即座に右端(100)に戻る (一方通行ループ)
        if (backgroundPositionX <= 0) {
            backgroundPositionX = maxOffset; 
        }
        
        // CSS変数を直接書き換え
        if (waveContainer) {
            waveContainer.style.setProperty('--wave-position', `${backgroundPositionX}%`);
        }
    }, 50); // 50ms (20fps) で更新
    console.log("JSによる波形アニメーション開始 (右から左へ)。");
}

function stopWaveAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
        // 停止時、グラデーションを中央に戻す (見た目上のリセット)
        if (waveContainer) {
            waveContainer.style.setProperty('--wave-position', `0%`);
        }
        console.log("JSによる波形アニメーション停止。");
    }
}


// 再生ボタンのイベントリスナー
playButton.addEventListener('click', () => {
    const trackUrl = playButton.dataset.trackUrl;
    
    if (!trackUrl || trackUrl.includes("dummy")) {
        alert("まず「ムードを分析する」ボタンを押して、楽曲を提案させてください！");
        return;
    }
    
    if (audioPlayer.src !== trackUrl) {
        audioPlayer.src = trackUrl;
        audioPlayer.load(); 
        console.log("Track source updated and loaded:", trackUrl);
    }

    if (audioPlayer.paused) {
        // --- ★ 再生開始 ★ ---
        
        // UIの視覚フィードバック（アニメーション開始）
        colorWheelContainer.classList.add('is-playing-pulse'); 
        const hue = selectedHsl.h;
        colorWheel.style.boxShadow = `0 0 25px 5px hsl(${hue}, 100%, 50%)`; 
        
        playButton.classList.add('playing'); 
        playerControls.classList.add('is-playing'); 

        startWaveAnimation(); // ★★★ アニメーション開始！ ★★★

        audioPlayer.play()
            .then(() => {
                console.log("音楽再生開始！");
            })
            .catch(e => {
                alert("再生エラーが発生しました。ブラウザのコンソールを確認してください。");
                console.error("再生エラー:", e);
                // 失敗時、状態をリセット
                colorWheelContainer.classList.remove('is-playing-pulse');
                
                playButton.classList.remove('playing');
                playerControls.classList.remove('is-playing');
                
                colorWheel.style.boxShadow = `0 0 15px rgba(0, 0, 0, 0.1)`; 
                stopWaveAnimation(); // ★★★ アニメーション停止！ ★★★
            });
    } else {
        // --- ★ 一時停止 ★ ---
        colorWheelContainer.classList.remove('is-playing-pulse'); 
        colorWheel.style.boxShadow = `0 0 15px rgba(0, 0, 0, 0.1)`; 
        
        playButton.classList.remove('playing');
        playerControls.classList.remove('is-playing'); 
        
        stopWaveAnimation(); // ★★★ アニメーション停止！ ★★★
        
        audioPlayer.pause();
        console.log("音楽一時停止。");
    }
});

// 再生が終了したらボタンとフィードバックをリセット
audioPlayer.addEventListener('ended', () => {
    playButton.classList.remove('playing');
    playerControls.classList.remove('is-playing'); 
    
    colorWheelContainer.classList.remove('is-playing-pulse'); 
    colorWheel.style.boxShadow = `0 0 15px rgba(0, 0, 0, 0.1)`; 
    console.log("音楽再生終了。");
    
    stopWaveAnimation(); // ★★★ アニメーション停止！ ★★★
});
