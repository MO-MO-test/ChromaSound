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

const bodyElement = document.body;
let selectedHsl = { h: 0, s: 0, l: 0 }; // 選択されたHSL値を保持

// ★★★ HTMLからaudio要素を取得し、ミュート解除もここに移動 ★★★
const audioPlayer = document.getElementById('audio-player-element'); // HTMLのaudio要素を取得
audioPlayer.muted = false; // 再生時にはミュートを解除する

const colorWheel = document.getElementById('color-wheel'); // ホイール自体
const colorWheelContainer = document.getElementById('color-wheel-container'); // ホイールの親コンテナ

// Canvasのサイズ設定
const size = 200;
colorWheelCanvas.width = size;
colorWheelCanvas.height = size;
const center = size / 2;
const radius = size / 2;

// ★★★ Web Audio API 関連の変数 ★★★
let audioContext;
let analyser;
let source; // MediaElementSourceNodeを保持
const waveCanvas = document.getElementById('audio-wave-canvas');
const waveCtx = waveCanvas.getContext('2d');
let animationFrameId; // アニメーションループID


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
// 3. カラーホイールの描画
// ===============================================
function drawColorWheel() {
    const gradient = ctx.createConicGradient(0, center, center);
    
    for (let i = 0; i <= 360; i++) {
        gradient.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`);
    }

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


// ===============================================
// 4. RGB -> HSL 変換ロジック
// ===============================================
function rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return {
        h: Math.round(h * 360), 
        s: Math.round(s * 100) / 100, 
        l: Math.round(l * 100) / 100  
    };
}


// ===============================================
// 5. ムード分析ロジック (analyzeMood)
// ===============================================
function analyzeMood(hslData, keywords) {
    // 1. 色相（H）とムードの結びつき
    let moodH = '';
    const h = hslData.h;
    if (h >= 330 || h < 30) { moodH = '情熱的な'; }
    else if (h >= 30 && h < 90) { moodH = '明るい、楽しい'; }
    else if (h >= 90 && h < 150) { moodH = '安らぎのある'; }
    else if (h >= 150 && h < 210) { moodH = '爽やかで静かな'; }
    else if (h >= 210 && h < 270) { moodH = '落ち着いた、知的な'; }
    else { moodH = '神秘的な'; }

    // 2. 濃淡（S, L）とエネルギーの結びつき
    let energySL = '';
    const s = hslData.s; 
    const l = hslData.l; 

    if (s > 0.7 && l > 0.5) { 
        energySL = 'ハイテンポで力強い';
    } else if (s < 0.2) { 
        energySL = '静寂で、テンポが遅い';
    } else if (l < 0.3) {
        energySL = '重厚感のある、シリアスな';
    } else {
        energySL = '中テンポで軽快な';
    }

    // 3. マルチキーワードの処理
    let influenceList = [];
    const keywordArray = keywords.toLowerCase().split(/[, ]+/).filter(k => k.length > 0);

    keywordArray.forEach(kw => {
        // --- 目的・感情系のキーワード ---
        if (kw === '勉強' || kw === '集中' || kw === '仕事') {
             influenceList.push('歌詞のないインストゥルメンタル構成');
        } else if (kw === 'リラックス' || kw === '癒やし' || kw === 'ヒーリング') {
            influenceList.push('環境音（アンビエント）とゆったりとしたテンポ');
        } else if (kw === '運動' || kw === 'ドライブ' || kw === '爽快') {
            influenceList.push('強いリズムとシンセまたはギターリフ');
        } else if (kw === '睡眠' || kw === '寝る') {
            influenceList.push('ホワイトノイズや静かなドローン音');
        } else if (kw === '悲しい' || kw === '切ない') {
            influenceList.push('マイナーコード進行とストリングス（弦楽器）の強調');
        } else if (kw === '楽しい' || kw === 'ハッピー') {
            influenceList.push('メジャーコード進行と軽快なパーカッション');
        } 
        
        // --- 場所・ムード系のキーワード ---
        else if (kw === '雨') {
            influenceList.push('しっとりとしたピアノの音色とリバーブ');
        } else if (kw === 'コーヒー' || kw === 'カフェ') {
            influenceList.push('洗練されたジャズまたはボサノバ風のサウンド');
        } else if (kw === 'チル') {
            influenceList.push('メロディよりムードを重視したスローテンポ');
        } else if (kw === '太陽') {
            influenceList.push('開放感のあるアップテンポとホーン（管楽器）の使用');
        } else if (kw === '月') {
            influenceList.push('神秘的なコードとミニマルなアレンジ');
        }
        
        // --- ジャンル系のキーワード ---
        else if (kw === 'kpop' || kw === 'jpop' || kw === '洋楽') {
            influenceList.push('強いビートとシンセサイザーを強調');
        }
        // --- 季節系のキーワード ---
        else if (kw === '春') {
            influenceList.push('明るく透明感のある音色と中〜高テンポ');
        } else if (kw === '夏') {
            influenceList.push('開放感と強いビート、マリンバの使用');
        } else if (kw === '秋') {
            influenceList.push('落ち着いたトーンのギターと少しノスタルジックなメロディ');
        } else if (kw === '冬') {
            influenceList.push('深く冷たいシンセパッドと低音域の強調');
        }
    });
    
    let keywordInfluence = '';
    if (influenceList.length > 0) {
        keywordInfluence = `特徴として、${influenceList.join('、')}を伴う`;
    }

    // 4. 最終的なムード記述とジャンル決定
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


// ===============================================
// 6. 音楽検索ロジック (searchTrack)
// ===============================================
function searchTrack(moodDescription, hslData) { 
    const searchTerms = moodDescription.toLowerCase().split(/[, ]+/).filter(t => t.length > 2);

    let bestMatch = null;
    let highestScore = -1;

    musicDatabase.forEach(track => {
        let score = 0;
        const trackKeywords = (track.title + ' ' + track.genre + ' ' + track.mood.join(' ')).toLowerCase();
        
        searchTerms.forEach(term => {
            if (trackKeywords.includes(term)) {
                score++;
            }
        });

        if (score > highestScore) {
            highestScore = score;
            bestMatch = track;
        }
    });

    // スコアが低い/見つからなかった場合のフォールバック処理 (色相に基づく)
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
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];

    const hsl = rgbToHsl(r, g, b);
    
    selectedHsl = hsl; 

    // 選択された色でシャドウを更新
    const hslColor = `hsl(${hsl.h}, ${hsl.s*100}%, ${hsl.l*100}%)`;
    colorWheel.style.setProperty('--selected-color', hslColor);
    colorWheel.classList.add('selected'); // 選択状態を有効にする
    
    console.log(`選択された色: HSL(${hsl.h}°, ${hsl.s*100}%, ${hsl.l*100}%)`);
});


// ===============================================
// 8. イベントリスナー（ムード分析）- 自動再生制限の回避を含む
// ===============================================
analyzeButton.addEventListener('click', () => {
    if (selectedHsl.h === 0 && selectedHsl.s === 0 && selectedHsl.l === 0) {
        alert("まずカラーホイールをクリックして色を選択してください！");
        return;
    }

    // ★★★ 自動再生制限の回避: 最初のユーザー操作でAudioContextを起動/再開 ★★★
    // ブラウザの自動再生ポリシーに対応するため、ユーザー操作（クリック）時にAudioContextを初期化/再開する
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    // ★★★ 修正終わり ★★★
    
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
// 9. イベントリスナー（再生ボタン）- Web Audio API 統合版
// ===============================================

// ★★★ Web Audio Visualizer の主要ロジック ★★★
function setupAudioContext() {
    if (!audioContext) {
        // analyzeButtonで既に起動されているはずですが、念のため再チェック
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // analyserとsourceノードが未設定の場合のみ設定
    if (!analyser) {
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; // 頻度ビンサイズ
        
        // Audio要素をSource Nodeに接続
        source = audioContext.createMediaElementSource(audioPlayer);
        source.connect(analyser);
        analyser.connect(audioContext.destination); // 最終出力を接続
    }
    
    // Contextがサスペンド状態の場合、再開
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

function startVisualizer() {
    setupAudioContext();
    
    // Waveform (時間領域) データを取得するための配列
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
        animationFrameId = requestAnimationFrame(draw);
        
        // 現在のオーディオデータを取得
        analyser.getByteTimeDomainData(dataArray);

        // キャンバスのサイズ設定を再取得
        waveCanvas.width = waveCanvas.clientWidth;
        waveCanvas.height = waveCanvas.clientHeight;
        const width = waveCanvas.width;
        const height = waveCanvas.height;
        
        // キャンバスをクリア
        waveCtx.fillStyle = 'rgba(0, 0, 0, 0)'; // 透明な背景
        waveCtx.fillRect(0, 0, width, height);

        // 波形を描画
        waveCtx.lineWidth = 2;
        waveCtx.strokeStyle = '#0ff'; // シアンのネオン色
        
        waveCtx.beginPath();

        const sliceWidth = width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0; // -1から1の範囲を0から2に変換（中央が1）
            const y = v * height / 2; // キャンバスの高さに合わせて調整

            if (i === 0) {
                waveCtx.moveTo(x, y);
            } else {
                waveCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        waveCtx.lineTo(width, height / 2); // 最後まで線を引く
        waveCtx.stroke();
    };

    draw();
}

function stopVisualizer() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null; // IDをリセット
        // キャンバスをクリア
        waveCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
    }
}

// 再生ボタンのイベントリスナー
playButton.addEventListener('click', () => {
    const trackUrl = playButton.dataset.trackUrl;
    
    if (!trackUrl || trackUrl.includes("dummy")) {
        alert("まず「ムードを分析する」ボタンを押して、楽曲を提案させてください！");
        return;
    }
    
    // 現在の音源と異なる場合は、ソースを更新してロード
    if (audioPlayer.src !== trackUrl) {
        audioPlayer.src = trackUrl;
        audioPlayer.load(); // 新しい音源をロード
    }

    if (audioPlayer.paused) {
        // --- ★ 再生開始 ★ ---
        
        setupAudioContext(); // AudioContextのセットアップを必ず行う
        startVisualizer(); // ビジュアライザーの開始

        // UIの視覚フィードバック
        colorWheelContainer.classList.add('is-playing-pulse'); 
        const hue = selectedHsl.h;
        colorWheel.style.boxShadow = `0 0 25px 5px hsl(${hue}, 100%, 50%)`; // 強い発光
        playButton.classList.add('playing');

        audioPlayer.play()
            .then(() => {
                console.log("音楽再生開始！");
            })
            .catch(e => {
                alert("ブラウザの自動再生制限により再生できませんでした。\n（ヒント: まず「ムードを分析する」ボタンを一度クリックしてみてください。）");
                console.error("再生エラー:", e);
                // 失敗時、状態をリセット
                stopVisualizer(); // ビジュアライザーを停止
                colorWheelContainer.classList.remove('is-playing-pulse');
                playButton.classList.remove('playing');
                colorWheel.style.boxShadow = `0 0 15px rgba(0, 0, 0, 0.1)`; // 通常の影に戻す
            });
    } else {
        // --- ★ 一時停止 ★ ---
        stopVisualizer(); // ビジュアライザーを停止
        colorWheelContainer.classList.remove('is-playing-pulse'); 
        colorWheel.style.boxShadow = `0 0 15px rgba(0, 0, 0, 0.1)`; // 通常の影に戻す
        playButton.classList.remove('playing');
        audioPlayer.pause();
        console.log("音楽一時停止。");
    }
});

// 再生が終了したらボタンとフィードバックをリセット
audioPlayer.addEventListener('ended', () => {
    stopVisualizer(); // ビジュアライザーを停止
    playButton.classList.remove('playing');
    colorWheelContainer.classList.remove('is-playing-pulse'); 
    colorWheel.style.boxShadow = `0 0 15px rgba(0, 0, 0, 0.1)`; // 通常の影に戻す
    console.log("音楽再生終了。");
});

// Canvasの初期サイズを設定（CSSと同期させるため、リサイズイベントも考慮）
window.addEventListener('resize', () => {
    if (waveCanvas) { // waveCanvasが存在するか確認
        waveCanvas.width = waveCanvas.clientWidth;
        waveCanvas.height = waveCanvas.clientHeight;
        // 再生中でない場合はクリア
        if (audioPlayer.paused && animationFrameId === null) {
            waveCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
        }
    }
});

// ページロード時に一度キャンバスサイズを設定
if (waveCanvas) {
    waveCanvas.width = waveCanvas.clientWidth;
    waveCanvas.height = waveCanvas.clientHeight;
}