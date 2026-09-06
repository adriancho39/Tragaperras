const symbols = ['🍒', '🍋', '🔔', '7️⃣', 'BAR', '💎'];
const symbolValues = {
    '🍒': 2,
    '🍋': 3,
    '🔔': 5,
    '7️⃣': 10,
    'BAR': 20,
    '💎': 50
};

let credits = 0.00;
let currentBet = 1.00;
let isSpinning = false;

const creditsDisplay = document.getElementById('credits');
const betDisplay = document.getElementById('bet');
const winDisplay = document.getElementById('win');
const spinBtn = document.getElementById('btn-spin');
const reels = [
    document.getElementById('reel1'),
    document.getElementById('reel2'),
    document.getElementById('reel3')
];

// Web Audio API Context
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'coin') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(2000, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'spin') {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'win') {
        oscillator.type = 'triangle';
        // Arpeggio
        const now = audioCtx.currentTime;
        [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25, 523.25].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gn = audioCtx.createGain();
            osc.connect(gn);
            gn.connect(audioCtx.destination);
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gn.gain.setValueAtTime(0.2, now + i * 0.1);
            gn.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.2);
        });
    } else if (type === 'click') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.05);
    }
}

function updateDisplay() {
    creditsDisplay.textContent = credits.toFixed(2);
    betDisplay.textContent = currentBet.toFixed(2);
}

function insertMoney(amount) {
    credits += amount;
    updateDisplay();
    playSound('coin');
}

document.getElementById('btn-coin').addEventListener('click', () => insertMoney(1));
document.getElementById('btn-bill').addEventListener('click', () => insertMoney(10));

document.getElementById('btn-max-bet').addEventListener('click', () => {
    playSound('click');
    if (credits >= 5) {
        currentBet = 5;
    } else {
        currentBet = credits > 0 ? credits : 1;
    }
    updateDisplay();
});

document.getElementById('btn-cashout').addEventListener('click', () => {
    playSound('click');
    if (credits > 0) {
        alert(`Has cobrado ${credits.toFixed(2)}€!`);
        credits = 0;
        updateDisplay();
    }
});

function getRandomSymbol() {
    return symbols[Math.floor(Math.random() * symbols.length)];
}

function spinReel(reel, duration) {
    return new Promise(resolve => {
        const interval = setInterval(() => {
            // Visual effect of spinning: update symbols rapidly
            reel.innerHTML = `
                <div class="symbol blur">${getRandomSymbol()}</div>
                <div class="symbol blur">${getRandomSymbol()}</div>
                <div class="symbol blur">${getRandomSymbol()}</div>
            `;
            // Play faint tick sound occasionally? Maybe too annoying.
        }, 60);

        setTimeout(() => {
            clearInterval(interval);
            // Final stop
            const finalSymbol = getRandomSymbol();
            reel.innerHTML = `
                <div class="symbol">${getRandomSymbol()}</div>
                <div class="symbol" data-value="${finalSymbol}">${finalSymbol}</div>
                <div class="symbol">${getRandomSymbol()}</div>
            `;
            playSound('spin'); // Stop sound
            resolve(finalSymbol);
        }, duration);
    });
}

spinBtn.addEventListener('click', async () => {
    if (isSpinning) return;

    if (credits < currentBet) {
        alert("No hay suficientes créditos");
        return;
    }

    // Initialize audio context on first user interaction if needed
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }

    isSpinning = true;
    spinBtn.disabled = true;
    credits -= currentBet;
    winDisplay.textContent = "0.00";
    updateDisplay();
    playSound('click');

    // Spin all reels with slight delays
    const results = await Promise.all([
        spinReel(reels[0], 1000 + Math.random() * 500),
        spinReel(reels[1], 1500 + Math.random() * 500),
        spinReel(reels[2], 2000 + Math.random() * 500)
    ]);

    checkWin(results);
    isSpinning = false;
    spinBtn.disabled = false;
});

function checkWin(results) {
    const [s1, s2, s3] = results;
    let winAmount = 0;

    if (s1 === s2 && s2 === s3) {
        // 3 of a kind
        winAmount = currentBet * symbolValues[s1];
        winDisplay.textContent = winAmount.toFixed(2);
        credits += winAmount;
        updateDisplay();
        playSound('win');

        // Win animation
        reels.forEach(r => r.children[1].classList.add('win-highlight'));
        setTimeout(() => {
            reels.forEach(r => r.children[1].classList.remove('win-highlight'));
        }, 3000);
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        // 2 of a kind (optional rule)
        // For now, let's add a small consolation prize for 2 cherries
        if ((s1 === '🍒' && s2 === '🍒') || (s2 === '🍒' && s3 === '🍒') || (s1 === '🍒' && s3 === '🍒')) {
            winAmount = currentBet * 1; // Money back
            winDisplay.textContent = winAmount.toFixed(2);
            credits += winAmount;
            updateDisplay();
            playSound('coin');
        }
    }
}
