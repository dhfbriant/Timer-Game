// ==========================================
// 1. AUDIO ENGINE (Web Audio API)
// ==========================================
const AudioEngine = {
  ctx: null,
  oscillator: null,
  
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  playTone(durationSec, freq = 440) {
    this.init();
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.05);
    gainNode.gain.setValueAtTime(1, this.ctx.currentTime + durationSec - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + durationSec);
    
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + durationSec);
    return osc;
  },

  playBeep(type) {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    if (type === 'start') {
      osc.frequency.setValueAtTime(880, now);
      gainNode.gain.setValueAtTime(1, now);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'stop') {
      osc.frequency.setValueAtTime(660, now);
      gainNode.gain.setValueAtTime(1, now);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'win') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      gainNode.gain.setValueAtTime(0.5, now);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'lose') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(200, now + 0.3);
      gainNode.gain.setValueAtTime(0.5, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'perfect') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  },

  playCountdown(num) {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    gain.gain.setValueAtTime(1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    if (num === 3) osc.frequency.setValueAtTime(440, now);
    else if (num === 2) osc.frequency.setValueAtTime(550, now);
    else if (num === 1) osc.frequency.setValueAtTime(660, now);
    else if (num === 'GO') osc.frequency.setValueAtTime(880, now);
    
    osc.start(now);
    osc.stop(now + 0.1);
  }
};

const GameState = {
  mode: 'sound',
  roundTotal: 3,
  roundCurrent: 1,
  phase: 'idle',
  targetValue: 0,
  players: {
    p1: { id: 'p1', score: 0, answer: null, locked: false, isPerfect: false },
    p2: { id: 'p2', score: 0, answer: null, locked: false, isPerfect: false }
  },
  
  resetRound() {
    this.players.p1.answer = null;
    this.players.p1.locked = false;
    this.players.p1.isPerfect = false;
    this.players.p2.answer = null;
    this.players.p2.locked = false;
    this.players.p2.isPerfect = false;
    this.targetValue = 0;
  },

  resetGame() {
    this.roundCurrent = 1;
    this.players.p1.score = 0;
    this.players.p2.score = 0;
    this.resetRound();
    this.phase = 'idle';
  }
};

const UI = {
  els: {
    modeTabs: document.querySelectorAll('.mode-tab'),
    roundDisplay: document.getElementById('round-display'),
    roundSelect: document.getElementById('round-select'),
    mainBtn: document.getElementById('main-action-btn'),
    contentP1: document.getElementById('content-p1'),
    contentP2: document.getElementById('content-p2'),
    statusP1: document.getElementById('status-p1'),
    statusP2: document.getElementById('status-p2'),
    scoreP1: document.getElementById('score-p1'),
    scoreP2: document.getElementById('score-p2'),
    sharedDisplay: document.getElementById('shared-display'),
    countdownOverlay: document.getElementById('countdown-overlay'),
    countdownText: document.getElementById('countdown-text'),
    revealOverlay: document.getElementById('reveal-overlay'),
    winScreen: document.getElementById('win-screen'),
    gameArea: document.getElementById('game-area')
  },

  init() {
    this.els.modeTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        if (GameState.phase !== 'idle' && GameState.phase !== 'gameover') return;
        this.els.modeTabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        const mode = e.target.getAttribute('data-mode');
        Game.setMode(mode);
      });
    });

    this.els.roundSelect.addEventListener('change', (e) => {
      GameState.roundTotal = parseInt(e.target.value);
      this.updateHeaderInfo();
    });

    this.els.mainBtn.addEventListener('click', () => {
      if (GameState.phase === 'idle') Game.startRound();
      else if (GameState.phase === 'playing' && GameState.mode === 'sound') SoundMode.playSound();
      else if (GameState.phase === 'reveal') Game.nextRound();
    });

    document.getElementById('next-round-btn').addEventListener('click', () => Game.nextRound());
    document.getElementById('play-again-btn').addEventListener('click', () => Game.reset(false));
    document.getElementById('main-menu-btn').addEventListener('click', () => Game.reset(true));

    this.updateHeaderInfo();
  },

  updateHeaderInfo() {
    this.els.roundDisplay.innerText = `ROUND ${GameState.roundCurrent}/${GameState.roundTotal}`;
  },

  updateScores() {
    const prevScore1 = parseInt(this.els.scoreP1.innerText);
    const prevScore2 = parseInt(this.els.scoreP2.innerText);

    this.els.scoreP1.innerText = GameState.players.p1.score;
    this.els.scoreP2.innerText = GameState.players.p2.score;

    if (GameState.players.p1.score > prevScore1) this.animateScorePop(this.els.scoreP1);
    if (GameState.players.p2.score > prevScore2) this.animateScorePop(this.els.scoreP2);
  },

  setStatus(p, text) {
    document.getElementById(`status-${p}`).innerText = text;
  },

  setMainBtn(text, disabled = false) {
    this.els.mainBtn.innerText = text;
    this.els.mainBtn.disabled = disabled;
    this.els.mainBtn.style.opacity = disabled ? '0.5' : '1';
  },

  renderGameContent(mode) {
    this.els.gameArea.classList.remove('mode-transition');
    void this.els.gameArea.offsetWidth;
    this.els.gameArea.classList.add('mode-transition');

    let contentHTML = '';
    
    if (mode === 'sound') {
      contentHTML = `
        <div class="sound-input-container">
          <div class="sound-label">TEBAKANMU (detik)</div>
          <div class="sound-input-group">
            <button class="action-btn mic-btn" style="margin-right: 8px;">MIC</button>
            <div class="stepper-col">
              <button class="stepper-btn" data-step="1.0">+</button>
              <button class="stepper-btn" data-step="0.1">+</button>
            </div>
            <input type="number" class="sound-input" value="0.0" step="0.1" min="0.1" max="30.0" readonly>
            <div class="stepper-col">
              <button class="stepper-btn" data-step="-1.0">-</button>
              <button class="stepper-btn" data-step="-0.1">-</button>
            </div>
          </div>
          <button class="action-btn lock-in-btn">LOCK IN</button>
        </div>
      `;
      this.els.sharedDisplay.innerHTML = `VS`;
      this.els.sharedDisplay.className = 'vs-badge';

    } else if (mode === 'stop') {
      contentHTML = `
        <div class="stop-mode-container">
          <div class="player-timer">??.??</div>
          <button class="stop-btn">START</button>
        </div>
      `;
      this.els.sharedDisplay.innerHTML = `WAITING...`;
      this.els.sharedDisplay.className = 'shared-target';
      
    } else if (mode === 'hold') {
      contentHTML = `
        <div class="hold-mode-container">
          <div class="sound-label">TAHAN SELAMA TARGET</div>
          <div class="hold-btn">
            <div class="hold-progress"></div>
            <span class="hold-text">HOLD</span>
          </div>
        </div>
      `;
      this.els.sharedDisplay.innerHTML = `WAITING...`;
      this.els.sharedDisplay.className = 'shared-target';
    }

    this.els.contentP1.innerHTML = contentHTML;
    this.els.contentP2.innerHTML = contentHTML;

    this.bindContentEvents(mode);
  },

  bindContentEvents(mode) {
    if (mode === 'sound') {
      ['p1', 'p2'].forEach(p => {
        const section = document.getElementById(`content-${p}`);
        const input = section.querySelector('.sound-input');
        const lockBtn = section.querySelector('.lock-in-btn');
        const steppers = section.querySelectorAll('.stepper-btn');
        const micBtn = section.querySelector('.mic-btn');

        steppers.forEach(btn => {
          btn.addEventListener('click', () => {
            if (GameState.players[p].locked || GameState.phase !== 'playing' || !SoundMode.soundPlayed) return;
            AudioEngine.init();
            let val = parseFloat(input.value) || 0;
            let step = parseFloat(btn.getAttribute('data-step'));
            val = Math.max(0.0, Math.min(30.0, val + step));
            input.value = val.toFixed(1);
          });
        });

        lockBtn.addEventListener('click', () => {
          if (GameState.players[p].locked || GameState.phase !== 'playing' || !SoundMode.soundPlayed) return;
          const val = parseFloat(input.value) || 0;
          if (val > 0) SoundMode.lockAnswer(p, val);
        });

        if (micBtn) {
          micBtn.addEventListener('click', () => {
            if (GameState.players[p].locked || GameState.phase !== 'playing' || !SoundMode.soundPlayed) return;
            SoundMode.recordVoice(p, input, micBtn);
          });
        }
      });
    } else if (mode === 'stop') {
      ['p1', 'p2'].forEach(p => {
        const btn = document.querySelector(`#content-${p} .stop-btn`);
        const handleStop = (e) => {
          e.preventDefault();
          if (GameState.players[p].locked || GameState.phase !== 'playing') return;
          StopMode.handleButton(p);
        };
        btn.addEventListener('mousedown', handleStop);
        btn.addEventListener('touchstart', handleStop, {passive: false});
      });
    } else if (mode === 'hold') {
      ['p1', 'p2'].forEach(p => {
        const btn = document.querySelector(`#content-${p} .hold-btn`);
        
        const startHold = (e) => {
          if(e) e.preventDefault();
          if (GameState.players[p].locked || GameState.phase !== 'playing') return;
          HoldMode.startHold(p);
        };
        
        const stopHold = (e) => {
          if(e) e.preventDefault();
          if (GameState.players[p].locked || GameState.phase !== 'playing' || !HoldMode.intervals[p]) return;
          HoldMode.stopHold(p);
        };

        btn.addEventListener('mousedown', startHold);
        btn.addEventListener('touchstart', startHold, {passive: false});
        
        window.addEventListener('mouseup', stopHold);
        window.addEventListener('touchend', stopHold);
      });
    }
  },

  animateScorePop(el) {
    el.classList.remove('score-pop');
    void el.offsetWidth;
    el.classList.add('score-pop');
  },

  animateSectionWin(p) {
    const section = document.getElementById(`player${p === 'p1' ? '1' : '2'}`);
    section.classList.remove('section-win');
    void section.offsetWidth;
    section.classList.add('section-win');
    this.spawnConfetti(section, p === 'p1' ? 'var(--color-p1)' : 'var(--color-p2)');
  },

  spawnConfetti(parent, color) {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    parent.appendChild(container);

    for (let i = 0; i < 40; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.backgroundColor = color;
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.animationDelay = `${Math.random() * 0.5}s`;
      container.appendChild(piece);
    }

    setTimeout(() => {
      if(container.parentNode) container.parentNode.removeChild(container);
    }, 2500);
  },

  showCountdown(callback) {
    this.els.countdownOverlay.classList.remove('hidden');
    let count = 3;
    
    const tick = () => {
      this.els.countdownText.innerText = count > 0 ? count : 'GO!';
      this.els.countdownText.style.color = count > 0 ? 'var(--color-white)' : 'var(--color-yellow)';
      
      this.els.countdownText.classList.remove('countdown-pop');
      void this.els.countdownText.offsetWidth;
      this.els.countdownText.classList.add('countdown-pop');
      
      AudioEngine.playCountdown(count > 0 ? count : 'GO');

      if (count === 0) {
        setTimeout(() => {
          this.els.countdownOverlay.classList.add('hidden');
          callback();
        }, 800);
      } else {
        count--;
        setTimeout(tick, 800);
      }
    };
    
    tick();
  },

  showWave() {
    this.els.sharedDisplay.className = 'wave-visualizer';
    this.els.sharedDisplay.innerHTML = `
      <div class="wave-bar wave-1"></div>
      <div class="wave-bar wave-2"></div>
      <div class="wave-bar wave-3"></div>
      <div class="wave-bar wave-4"></div>
      <div class="wave-bar wave-5"></div>
    `;
  },
  
  clearWave() {
    this.els.sharedDisplay.className = 'vs-badge';
    this.els.sharedDisplay.innerHTML = 'VS';
  },

  showReveal(results) {
    document.getElementById('reveal-title').innerText = `HASIL RONDE ${GameState.roundCurrent}`;
    
    let unit = GameState.mode === 'sound' ? 's' : 's';
    if(GameState.mode === 'sound') {
      document.getElementById('reveal-target').innerText = `DURASI ASLI: ${GameState.targetValue.toFixed(1)}${unit}`;
    } else {
      document.getElementById('reveal-target').innerText = `TARGET: ${GameState.targetValue.toFixed(2)}${unit}`;
    }

    ['p1', 'p2'].forEach(p => {
      const res = results[p];
      document.getElementById(`reveal-val-${p}`).innerText = `${res.ans.toFixed(GameState.mode==='sound'?1:2)}${unit}`;
      document.getElementById(`reveal-diff-${p}`).innerText = `selisih: ${res.diff.toFixed(GameState.mode==='sound'?1:2)}${unit}`;
      
      const resEl = document.getElementById(`reveal-res-${p}`);
      resEl.className = 'reveal-res';
      if (res.win) {
        resEl.innerText = res.perfect ? 'PERFECT!' : 'MENANG';
        resEl.classList.add('res-win');
      } else if (res.tie) {
        resEl.innerText = 'SERI!';
        resEl.classList.add('res-tie');
      } else {
        resEl.innerText = '';
      }
    });

    if (GameState.roundCurrent >= GameState.roundTotal) {
      document.getElementById('next-round-btn').innerText = 'LIHAT HASIL AKHIR';
    } else {
      document.getElementById('next-round-btn').innerText = 'LANJUT RONDE';
    }

    this.els.revealOverlay.classList.remove('hidden');
  },

  showWinScreen() {
    this.els.revealOverlay.classList.add('hidden');
    this.els.winScreen.classList.remove('hidden');
    
    const p1Score = GameState.players.p1.score;
    const p2Score = GameState.players.p2.score;
    const p1Name = document.querySelector('.p1 .player-label').innerText;
    const p2Name = document.querySelector('.p2 .player-label').innerText;

    document.getElementById('win-score-p1').innerText = p1Score;
    document.getElementById('win-score-p2').innerText = p2Score;

    let title = "";
    if (p1Score > p2Score) {
      title = `${p1Name} MENANG!`;
      this.spawnConfetti(document.body, 'var(--color-p1)');
    } else if (p2Score > p1Score) {
      title = `${p2Name} MENANG!`;
      this.spawnConfetti(document.body, 'var(--color-p2)');
    } else {
      title = `SERI!`;
      this.spawnConfetti(document.body, 'var(--color-yellow)');
    }
    
    document.getElementById('win-title').innerText = title;
    AudioEngine.playBeep(p1Score === p2Score ? 'win' : 'win');
  }
};

const SoundMode = {
  soundPlayed: false,
  timeoutId: null,

  init() {
    this.soundPlayed = false;
    UI.setMainBtn('PLAY SOUND');
    UI.setStatus('p1', 'Waiting for host...');
    UI.setStatus('p2', 'Waiting for host...');
    UI.els.sharedDisplay.innerHTML = `VS`;
    UI.els.sharedDisplay.className = 'vs-badge';
  },

  playSound() {
    if (this.soundPlayed) return;
    this.soundPlayed = true;
    UI.setMainBtn('PLAYING...', true);
    UI.setStatus('p1', 'DENGARKAN...');
    UI.setStatus('p2', 'DENGARKAN...');
    
    GameState.targetValue = Math.floor(Math.random() * 190 + 10) / 10; 
    
    UI.showWave();
    AudioEngine.playTone(GameState.targetValue, 440 + Math.random()*200);

    setTimeout(() => {
      UI.clearWave();
      UI.setStatus('p1', 'Masukkan Tebakan!');
      UI.setStatus('p2', 'Masukkan Tebakan!');
      UI.setMainBtn('WAITING PLAYERS...', true);
      
      this.timeoutId = setTimeout(() => {
        ['p1', 'p2'].forEach(p => {
          if (!GameState.players[p].locked) {
            this.lockAnswer(p, 0);
          }
        });
      }, 30000); 
    }, GameState.targetValue * 1000);
  },

  lockAnswer(p, value) {
    GameState.players[p].answer = value;
    GameState.players[p].locked = true;
    UI.setStatus(p, 'LOCKED IN');
    AudioEngine.playBeep('stop');

    const btn = document.querySelector(`#content-${p} .lock-in-btn`);
    if(btn) {
      btn.innerText = 'LOCKED';
      btn.style.backgroundColor = 'var(--color-bg)';
      btn.disabled = true;
    }

    if (GameState.players.p1.locked && GameState.players.p2.locked) {
      clearTimeout(this.timeoutId);
      Game.evaluateRound();
    }
  },

  recordVoice(p, inputEl, micBtn) {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      alert('Mic tidak didukung di browser ini.');
      return;
    }
    
    micBtn.innerText = 'REC...';
    micBtn.style.backgroundColor = 'var(--color-p1)';

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks = [];

        mediaRecorder.addEventListener("dataavailable", event => {
          audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener("stop", () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob);

          micBtn.innerText = 'PROSES...';
          
          fetch('http://localhost:5000/parse-time', {
            method: 'POST',
            body: formData
          })
          .then(response => response.json())
          .then(data => {
            if (data.seconds !== undefined) {
              inputEl.value = parseFloat(data.seconds).toFixed(1);
            } else {
              alert('Gagal mendeteksi waktu dari suara.');
            }
            micBtn.innerText = 'MIC';
            micBtn.style.backgroundColor = 'var(--color-white)';
          })
          .catch(err => {
            console.error(err);
            alert('Server Python tidak terhubung.');
            micBtn.innerText = 'MIC';
            micBtn.style.backgroundColor = 'var(--color-white)';
          });
          
          stream.getTracks().forEach(track => track.stop());
        });

        mediaRecorder.start();
        setTimeout(() => {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }, 5000); 
      })
      .catch(err => {
        console.error(err);
        micBtn.innerText = 'MIC';
        micBtn.style.backgroundColor = 'var(--color-white)';
        alert('Akses mic ditolak.');
      });
  }
};

const StopMode = {
  intervals: { p1: null, p2: null },
  startTimes: { p1: 0, p2: 0 },
  maxTime: 15.00,
  
  init() {
    GameState.targetValue = Math.floor(Math.random() * 700 + 300) / 100;
    UI.els.sharedDisplay.innerHTML = `TARGET: ${GameState.targetValue.toFixed(2)}`;
    UI.setStatus('p1', 'Klik START untuk mulai');
    UI.setStatus('p2', 'Klik START untuk mulai');
    UI.setMainBtn('FOCUS...', true);
    this.intervals = { p1: null, p2: null };
    this.startTimes = { p1: 0, p2: 0 };
    
    ['p1', 'p2'].forEach(p => {
      const btn = document.querySelector(`#content-${p} .stop-btn`);
      if(btn) btn.innerText = 'START';
      const timerEl = document.querySelector(`#content-${p} .player-timer`);
      if(timerEl) timerEl.innerText = '??.??';
    });
  },

  handleButton(p) {
    if (GameState.players[p].locked) return;
    
    if (!this.startTimes[p]) {
      this.startPlayerTimer(p);
    } else {
      this.playerStop(p);
    }
  },

  startPlayerTimer(p) {
    this.startTimes[p] = performance.now();
    const btn = document.querySelector(`#content-${p} .stop-btn`);
    btn.innerText = 'STOP';
    UI.setStatus(p, 'TIMER BERJALAN');
    AudioEngine.playBeep('start');
    
    const update = () => {
      const elapsed = (performance.now() - this.startTimes[p]) / 1000;
      
      const diff = Math.abs(elapsed - GameState.targetValue);
      if (diff < 0.5) {
        UI.els.sharedDisplay.style.color = 'var(--color-p1)';
        UI.els.sharedDisplay.classList.add('pulse');
      } else {
        UI.els.sharedDisplay.style.color = 'var(--color-black)';
        UI.els.sharedDisplay.classList.remove('pulse');
      }

      if (elapsed >= this.maxTime) {
        this.playerStop(p, this.maxTime);
      } else {
        this.intervals[p] = requestAnimationFrame(update);
      }
    };
    
    this.intervals[p] = requestAnimationFrame(update);
  },

  playerStop(p, forceValue = null) {
    if (GameState.players[p].locked) return;
    
    if (this.intervals[p]) {
      cancelAnimationFrame(this.intervals[p]);
      this.intervals[p] = null;
    }
    
    const now = performance.now();
    const elapsed = forceValue !== null ? forceValue : (now - this.startTimes[p]) / 1000;
    
    GameState.players[p].answer = elapsed;
    GameState.players[p].locked = true;
    
    const timerEl = document.querySelector(`#content-${p} .player-timer`);
    if(timerEl) timerEl.innerText = 'XX.XX';
    
    const btn = document.querySelector(`#content-${p} .stop-btn`);
    if(btn) {
      btn.classList.add('locked', 'btn-lock');
      btn.innerText = 'LOCKED';
    }
    
    UI.setStatus(p, `STOPPED`);
    AudioEngine.playBeep('stop');

    if (GameState.players.p1.locked && GameState.players.p2.locked) {
      Game.evaluateRound();
    }
  }
};

const HoldMode = {
  intervals: { p1: null, p2: null },
  startTimes: { p1: 0, p2: 0 },
  maxTime: 10.0,
  
  init() {
    GameState.targetValue = Math.floor(Math.random() * 40 + 20) / 10;
    UI.els.sharedDisplay.innerHTML = `TARGET: ${GameState.targetValue.toFixed(1)}s`;
    UI.setStatus('p1', 'Tahan tombol selama target!');
    UI.setStatus('p2', 'Tahan tombol selama target!');
    UI.setMainBtn('GO!', true);
    this.intervals = { p1: null, p2: null };
  },

  startHold(p) {
    if (GameState.players[p].locked) return;
    AudioEngine.init();
    
    this.startTimes[p] = performance.now();
    const btn = document.querySelector(`#content-${p} .hold-btn`);
    const progress = document.querySelector(`#content-${p} .hold-progress`);
    btn.classList.add('holding');
    UI.setStatus(p, 'HOLDING...');
    
    const maxVisualTime = GameState.targetValue * 1.5;

    const update = () => {
      const elapsed = (performance.now() - this.startTimes[p]) / 1000;
      let pct = (elapsed / maxVisualTime) * 100;
      
      if (elapsed > GameState.targetValue) {
        btn.classList.add('overshoot');
        if (elapsed > GameState.targetValue + 0.2) btn.classList.add('shake');
      }
      
      progress.style.width = `${Math.min(100, pct)}%`;
      
      if (elapsed >= this.maxTime) {
        this.stopHold(p, this.maxTime);
      } else {
        this.intervals[p] = requestAnimationFrame(update);
      }
    };
    
    this.intervals[p] = requestAnimationFrame(update);
  },

  stopHold(p, forceValue = null) {
    if (GameState.players[p].locked || !this.intervals[p]) return;
    cancelAnimationFrame(this.intervals[p]);
    this.intervals[p] = null;
    
    const elapsed = forceValue !== null ? forceValue : (performance.now() - this.startTimes[p]) / 1000;
    GameState.players[p].answer = elapsed;
    GameState.players[p].locked = true;
    
    const btn = document.querySelector(`#content-${p} .hold-btn`);
    btn.classList.remove('holding', 'shake', 'overshoot');
    btn.classList.add('locked');
    btn.querySelector('.hold-text').innerText = 'LOCKED';
    
    UI.setStatus(p, 'LOCKED IN');
    AudioEngine.playBeep('stop');

    if (GameState.players.p1.locked && GameState.players.p2.locked) {
      setTimeout(() => Game.evaluateRound(), 500);
    }
  }
};

const Game = {
  setMode(mode) {
    GameState.resetGame();
    GameState.mode = mode;
    UI.renderGameContent(mode);
    UI.els.roundSelect.disabled = false;
    UI.setMainBtn('START ROUND');
  },

  startRound() {
    AudioEngine.init();
    GameState.phase = 'countdown';
    UI.els.roundSelect.disabled = true;
    UI.setMainBtn('GET READY...', true);

    UI.showCountdown(() => {
      GameState.phase = 'playing';
      
      if (GameState.mode === 'sound') {
        SoundMode.init();
      } else if (GameState.mode === 'stop') {
        StopMode.init();
      } else if (GameState.mode === 'hold') {
        HoldMode.init();
      }
    });
  },

  evaluateRound() {
    GameState.phase = 'reveal';
    UI.setMainBtn('CALCULATING...', true);
    
    const target = GameState.targetValue;
    const ans1 = GameState.players.p1.answer;
    const ans2 = GameState.players.p2.answer;
    
    const diff1 = Math.abs(ans1 - target);
    const diff2 = Math.abs(ans2 - target);
    
    let res1 = { ans: ans1, diff: diff1, win: false, tie: false, perfect: false };
    let res2 = { ans: ans2, diff: diff2, win: false, tie: false, perfect: false };

    const isSound = GameState.mode === 'sound';
    const perfectThresh = isSound ? 0.3 : 0.05;

    const d1 = Math.round(diff1 * 1000);
    const d2 = Math.round(diff2 * 1000);

    if (d1 < d2) {
      res1.win = true;
      GameState.players.p1.score += 2;
      UI.animateSectionWin('p1');
    } else if (d2 < d1) {
      res2.win = true;
      GameState.players.p2.score += 2;
      UI.animateSectionWin('p2');
    } else {
      res1.tie = true;
      res2.tie = true;
      GameState.players.p1.score += 1;
      GameState.players.p2.score += 1;
    }

    if (diff1 <= perfectThresh) {
      res1.perfect = true;
      GameState.players.p1.score += 1;
    }
    if (diff2 <= perfectThresh) {
      res2.perfect = true;
      GameState.players.p2.score += 1;
    }

    if (res1.perfect || res2.perfect) {
      AudioEngine.playBeep('perfect');
    } else if (res1.win || res2.win) {
      AudioEngine.playBeep('win');
    } else {
      AudioEngine.playBeep('stop');
    }

    UI.updateScores();
    
    setTimeout(() => {
      UI.showReveal({ p1: res1, p2: res2 });
      UI.setMainBtn('REVEAL', true);
    }, 1000);
  },

  nextRound() {
    UI.els.revealOverlay.classList.add('hidden');
    
    if (GameState.roundCurrent >= GameState.roundTotal) {
      GameState.phase = 'gameover';
      UI.showWinScreen();
    } else {
      GameState.roundCurrent++;
      UI.updateHeaderInfo();
      GameState.resetRound();
      
      UI.renderGameContent(GameState.mode);
      UI.setMainBtn('START ROUND', false);
      GameState.phase = 'idle';
      
      UI.els.sharedDisplay.classList.remove('pulse');
      UI.els.sharedDisplay.style.color = 'var(--color-black)';
    }
  },

  reset(fullMenu) {
    UI.els.winScreen.classList.add('hidden');
    GameState.resetGame();
    UI.updateHeaderInfo();
    UI.updateScores();
    UI.els.roundSelect.disabled = false;
    
    if (fullMenu) {
      this.setMode('sound');
      document.querySelector('[data-mode="sound"]').classList.add('active');
      document.querySelector('[data-mode="stop"]').classList.remove('active');
      document.querySelector('[data-mode="hold"]').classList.remove('active');
    } else {
      UI.renderGameContent(GameState.mode);
      UI.setMainBtn('START ROUND', false);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  UI.init();
  Game.setMode('sound');
});
