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

const playerControls = playButton.closest('.player-controls');

const waveContainer = document.querySelector('.audio-wave-container'); 
let animationInterval; 

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
// 2. 音楽データリスト（最終調整版）
// ===============================================
const musicDatabase = [
    // 1. 静かで癒やし系（内省、静寂、集中、勉強）
    { 
        title: "Quiet Raindrops (Ambient)", 
        mood: ["calm", "rain", "slow", "ambient", "healing", "winter", "study", "logic", "abstract", "内省", "静寂", "集中", "瞑想"], 
        genre: "Ambient/Piano", 
        url: "https://dl.vgm-db.com/sample/8586/mp3/01-11585257-2.mp3" // アコースティックピアノ音源
    }, 
    
    // 2. 明るいポップ（アップビート、元気）
    { title: "Summer Day Pop (Upbeat)", mood: ["bright", "sun", "upbeat", "pop", "energetic", "summer", "sport", "drive", "happy"], genre: "Pop", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    
    // 3. ジャズ/ボサノバ（集中、コーヒー、知的なリラックス）
    { title: "Midnight Coffee Jazz (Bossa)", mood: ["relaxed", "coffee", "sophisticated", "slow", "jazz", "bossa nova", "work", "autumn", "focus", "intellectual"], genre: "Jazz/Bossa Nova", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }, 
    
    // 4. エレクトロ/KPOP（SF、サイバー、高揚感）
    { title: "Neon Future Beat (Electro)", mood: ["high-tempo", "energetic", "synth", "powerful", "rock", "electro", "drive", "sci-fi", "cyber", "future"], genre: "Electro/KPOP", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
    
    // 5. ヒーリング（平和、安らぎ、夢）
    { title: "Zen Garden Flute (Healing)", mood: ["peace", "quiet", "instrumental", "refreshing", "slow", "spring", "healing", "dream", "fantasy"], genre: "Healing/Instrumental", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
    
    // 6. メタル/ロック（戦闘、アクション、重厚感）
    { title: "Heavy Metal Night (Rock)", mood: ["heavy", "serious", "powerful", "rock", "metal", "winter", "battle", "action", "fps"], genre: "Rock/Metal", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" }
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
    if (h >= 330 || h < 30) { moodH = 'passionate'; }
    else if (h >= 30 && h < 90) { moodH = 'bright, joyful'; }
    else if (h >= 90 && h < 150) { moodH = 'peaceful'; }
    else if (h >= 150 && h < 210) { moodH = 'refreshing, quiet'; }
    else if (h >= 210 && h < 270) { moodH = 'calm, intellectual'; }
    else { moodH = 'mysterious'; }

    let energySL = '';
    const s = hslData.s; 
    const l = hslData.l; 

    if (s > 0.7 && l > 0.5) { 
        energySL = 'high-tempo and powerful';
    } else if (s < 0.2) { 
        energySL = 'silent, slow-tempo';
    } else if (l < 0.3) {
        energySL = 'heavy and serious';
    } else {
        energySL = 'mid-tempo and light';
    }

    let influenceList = [];
    
    // キーワードをすべて小文字に変換
    const keywordArray = keywords.toLowerCase().split(/[, ]+/).filter(k => k.length > 0);

    keywordArray.forEach(kw => {
        // ★★★ 共通キーワード (勉強・仕事) ★★★
        if (['study', 'focus', 'work', '勉強', '集中', '仕事'].includes(kw)) {
             influenceList.push('instrumental structure without lyrics');
        } 
        // ★★★ 共通キーワード (リラックス・癒やし) ★★★
        else if (['relax', 'healing', 'chill', 'リラックス', '癒し', '落ち着く'].includes(kw)) {
            influenceList.push('ambient soundscape and relaxed tempo');
        } 
        // ★★★ 共通キーワード (運動・元気) ★★★
        else if (['sport', 'drive', 'energetic', '運動', 'ドライブ', '元気'].includes(kw)) {
            influenceList.push('strong rhythm and synth or guitar riffs');
        } 
        // ★★★ 共通キーワード (睡眠・夢) ★★★
        else if (['sleep', 'bed', '睡眠', '眠り'].includes(kw)) {
            influenceList.push('white noise or quiet drone sounds');
        } else if (['dream', '夢', '幻想'].includes(kw)) {
            influenceList.push('ethereal synth pads and slow, evolving melodies');
        } 
        // ★★★ 共通キーワード (感情) ★★★
        else if (['sad', 'lonely', '悲しい', '寂しい'].includes(kw)) {
            influenceList.push('minor chord progression and string emphasis');
        } else if (['happy', 'joyful', '楽しい', '嬉しい'].includes(kw)) {
            influenceList.push('major chord progression and light percussion');
        } 
        // ★★★ 環境キーワード ★★★
        else if (['rain', 'cafe', '雨', 'カフェ', 'coffee'].includes(kw)) { // coffeeを追加
            influenceList.push('smooth piano tones and reverb, jazz/bossa nova elements');
        } else if (['sun', 'summer', '太陽', '夏'].includes(kw)) {
            influenceList.push('open-air atmosphere and upbeat tempo');
        } 
        
        /* ★★★ 拡張キーワード: ゲーム・ファンタジー ★★★ */
        else if (['rpg', 'fantasy', 'medieval', 'rpg', 'ファンタジー', '中世'].includes(kw)) {
            influenceList.push('orchestral sounds and epic melodies, cinematic feel');
        } else if (['sci-fi', 'cyber', 'future', 'sf', 'サイバー', '未来'].includes(kw)) {
            influenceList.push('heavy synth bass and electronic textures, futuristic beat');
        } else if (['fps', 'battle', 'action', '戦闘', 'アクション', 'バトル'].includes(kw)) {
            influenceList.push('fast tempo and aggressive percussion, high energy');
        } else if (['lo-fi', 'aesthetic', 'ローファイ', 'エモい'].includes(kw)) {
            influenceList.push('vinyl crackle effects and simple, repetitive melodies');
        }

        /* ★★★ 拡張キーワード: 数学・科学・抽象 ★★★ */
        else if (['math', 'logic', 'abstract', '数', '論理', '抽象'].includes(kw)) {
            influenceList.push('minimalist and repetitive patterns, complex rhythms');
        } else if (['universe', 'space', '宇宙', '星'].includes(kw)) {
            influenceList.push('vast, deep synth pads and echoing sound effects');
        } else if (['technology', 'tech', 'テクノロジー', '機械'].includes(kw)) {
            influenceList.push('clean, rhythmic beeps and digital sound synthesis');
        }
        
        /* 季節・その他の用語 */
        else if (['spring', '春'].includes(kw)) {
            influenceList.push('bright, clear tones and mid-to-high tempo');
        } else if (['autumn', 'fall', '秋'].includes(kw)) {
            influenceList.push('calm guitar tones and slightly nostalgic melodies');
        } else if (['winter', '冬'].includes(kw)) {
            influenceList.push('deep, cold synth pads and low-end emphasis');
        }
    });
    
    let keywordInfluence = '';
    if (influenceList.length > 0) {
        keywordInfluence = `with features like: ${influenceList.join(', ')}`;
    }

    let primaryGenre = 'Instrumental'; 

    // 1. キーワードによる決定 (最優先)
    if (keywordArray.includes('pop') || keywordArray.includes('kpop')) {
        primaryGenre = 'Pop/KPOP';
    } else if (keywordArray.includes('jazz') || keywordArray.includes('bossa')) {
        primaryGenre = 'Jazz/Bossa Nova'; 
    } else if (keywordArray.includes('rpg') || keywordArray.includes('fantasy') || keywordArray.includes('ファンタジー')) {
        primaryGenre = 'Cinematic/Orchestral';
    } 
    
    // 2. キーワードがなければ色相で大まかに決定
    else {
        const h = hslData.h;
        if (h >= 330 || h < 30 || keywordArray.includes('rock')) { 
             primaryGenre = 'Rock or Electro'; 
        } else if (h >= 210 && h < 270 || keywordArray.includes('ambient')) { 
            primaryGenre = 'Ambient or Classical';
        }
    }
    
    return `Based on color and keywords, we propose a ${energySL} ${moodH} track ${keywordInfluence}. Suggested Genre: ${primaryGenre}.`;
}


function searchTrack(moodDescription, hslData) { 
    // スコアリングの対象とするキーワードリストを作成
    const searchTerms = moodDescription.toLowerCase().split(/[, ]+/).filter(t => t.length > 2);

    let bestMatch = null;
    let highestScore = -1;

    musicDatabase.forEach(track => {
        let score = 0;
        const trackKeywords = (track.title + ' ' + track.genre + ' ' + track.mood.join(' ')).toLowerCase();
        
        searchTerms.forEach(term => {
            // キーワードの一部が含まれていれば点数を加算（文字数に応じて重み付け）
            if (trackKeywords.includes(term)) {
                score += term.length; 
            }
        });

        // HSLの「色相(H)」に基づき、トラックのムードに一致する場合、ボーナス点を加算
        const h = hslData.h;
        if (h >= 330 || h < 30) { 
            if (track.mood.includes('passionate') || track.mood.includes('rock') || track.mood.includes('heavy')) score += 5;
        }
        else if (h >= 30 && h < 90) { 
            if (track.mood.includes('bright') || track.mood.includes('joyful') || track.mood.includes('summer')) score += 5;
        }
        else if (h >= 210 && h < 270) { 
            if (track.mood.includes('calm') || track.mood.includes('quiet') || track.mood.includes('study')) score += 5;
        }
        // ジャズ向け: 温かみのある色相（オレンジ系）に強めのボーナス
        else if (h >= 15 && h < 60) {
            if (track.mood.includes('relaxed') || track.mood.includes('coffee') || track.mood.includes('jazz')) score += 8; 
        }

        if (score > highestScore) {
            highestScore = score;
            bestMatch = track;
        }
    });

    // 最低マッチング点数の閾値（8点）を設定
    if (highestScore < 8 || !bestMatch) { 
        console.log("Fallback processing: Suggesting track based on hue (Score too low: " + highestScore + ")");

        let fallbackMood = '';
        const h = hslData.h;
        if (h >= 330 || h < 30) { fallbackMood = 'passionate'; }
        else if (h >= 30 && h < 90) { fallbackMood = 'bright'; }
        else if (h >= 90 && h < 150) { fallbackMood = 'peace'; }
        else if (h >= 150 && h < 210) { fallbackMood = 'refreshing'; }
        else if (h >= 210 && h < 270) { fallbackMood = 'calm'; }
        else { fallbackMood = 'mysterious'; }

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

    const hslColor = `hsl(${hsl.h}, ${hsl.s*100}%, ${hsl.l*100}%)`;
    colorWheel.style.setProperty('--selected-color', hslColor);
    colorWheel.classList.add('selected'); 
    
    console.log(`Selected Color: HSL(${hsl.h}°, ${hsl.s*100}%, ${hsl.l*100}%)`);
});


// ===============================================
// 8. イベントリスナー（ムード分析） 
// ===============================================
analyzeButton.addEventListener('click', () => {
    if (selectedHsl.h === 0 && selectedHsl.s === 0 && selectedHsl.l === 0) {
        alert("Please click the color wheel to select a color first!");
        return;
    }
    
    const colorData = selectedHsl; 
    const keywordText = keywordsInput.value.trim();
    
    const musicMoodDescription = analyzeMood(colorData, keywordText); 
    const suggestedTrack = searchTrack(musicMoodDescription, colorData);

    const trackMoodTags = suggestedTrack.mood.join(', ');
    
    const finalMoodDisplay = `Based on color and keywords, we propose a track with the following elements: ${trackMoodTags} (${suggestedTrack.genre}). ${musicMoodDescription}`;

    moodResultDisplay.textContent = finalMoodDisplay;
    trackTitleDisplay.textContent = `Track Name: ${suggestedTrack.title}`;
    
    playButton.dataset.trackUrl = suggestedTrack.url; 

    const hslColor = `hsl(${selectedHsl.h}, ${selectedHsl.s*100}%, ${selectedHsl.l*100}%)`;
    colorWheel.style.setProperty('--selected-color', hslColor);
    colorWheel.classList.add('selected');
});


// ===============================================
// 9. イベントリスナー（再生ボタン） 
// ===============================================

let backgroundPositionX = 0;
let waveSpeed = 0.5; 
const maxOffset = 100; 

function startWaveAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval); 
    }
    
    // ★修正点: 初期位置を左端 (0) に設定
    backgroundPositionX = 0; 
    
    // ★修正点: 速度を正の数に設定し、左から右へ流れるようにする
    waveSpeed = 0.5; 

    animationInterval = setInterval(() => {
        backgroundPositionX += waveSpeed;
        
        // 右端 (maxOffset) に達したら、左端 (0) に戻る
        if (backgroundPositionX >= maxOffset) { 
            backgroundPositionX = 0; 
        }
        
        if (waveContainer) {
            waveContainer.style.setProperty('--wave-position', `${backgroundPositionX}%`);
        }
    }, 50); 
    console.log("Wave animation started (Left to Right).");
}

function stopWaveAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
        if (waveContainer) {
            waveContainer.style.setProperty('--wave-position', `0%`);
        }
        console.log("Wave animation stopped.");
    }
}


playButton.addEventListener('click', () => {
    const trackUrl = playButton.dataset.trackUrl;
    
    if (!trackUrl || trackUrl.includes("dummy")) {
        alert("Please press the 'Analyze Mood' button to suggest a track first!");
        return;
    }
    
    if (audioPlayer.src !== trackUrl) {
        audioPlayer.src = trackUrl;
        audioPlayer.load(); 
        console.log("Track source updated and loaded:", trackUrl);
    }

    if (audioPlayer.paused) {
        colorWheelContainer.classList.add('is-playing-pulse'); 
        const hue = selectedHsl.h;
        colorWheel.style.boxShadow = `0 0 25px 5px hsl(${hue}, 100%, 50%)`; 
        playButton.classList.add('playing'); 
        playerControls.classList.add('is-playing'); 
        startWaveAnimation(); 

        audioPlayer.play()
            .then(() => {
                console.log("Music playback started!");
            })
            .catch(e => {
                alert("Playback error occurred. Check the browser console.");
                console.error("Playback Error:", e);
                colorWheelContainer.classList.remove('is-playing-pulse');
                playButton.classList.remove('playing');
                playerControls.classList.remove('is-playing');
                colorWheel.style.boxShadow = `0 0 15px rgba(0, 0, 0, 0.1)`; 
                stopWaveAnimation(); 
            });
    } else {
        colorWheelContainer.classList.remove('is-playing-pulse'); 
        colorWheel.style.boxShadow = `0 0 15px rgba(0, 0, 0, 0.1)`; 
        playButton.classList.remove('playing');
        playerControls.classList.remove('is-playing'); 
        stopWaveAnimation(); 
        audioPlayer.pause();
        console.log("Music paused.");
    }
});

audioPlayer.addEventListener('ended', () => {
    playButton.classList.remove('playing');
    playerControls.classList.remove('is-playing'); 
    colorWheelContainer.classList.remove('is-playing-pulse'); 
    colorWheel.style.boxShadow = `0 0 15px rgba(0, 0, 0, 0.1)`; 
    console.log("Music playback ended.");
    stopWaveAnimation(); 
});
