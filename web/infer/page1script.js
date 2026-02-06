export function page1script(p) {
    function showToast(message, duration = 3000) {
        let container = document.getElementById("toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            document.body.appendChild(container);
        }
        container.style.position = "fixed";
        container.style.bottom = "20px";
        container.style.left = "50%";
        container.style.transform = "translateX(-50%)";
        container.style.zIndex = "9999";

        const toast = document.createElement("div");
        toast.textContent = message;
        toast.style.background = "rgba(0,0,0,0.8)";
        toast.style.color = "#fff";
        toast.style.padding = "10px 20px";
        toast.style.marginTop = "10px";
        toast.style.borderRadius = "5px";
        toast.style.fontFamily = "sans-serif";
        toast.style.fontSize = "14px";
        toast.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s ease";

        container.appendChild(toast);

        // Fade in
        requestAnimationFrame(() => {
            toast.style.opacity = "1";
        });

        // Fade out after duration
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.addEventListener("transitionend", () => {
                toast.remove();
            });
        }, duration);
    }

    function debugAudio(msg, data = null) {
        console.log(`[Audio Debug] ${msg}`, data || '');
        // Optional: Show in UI
        // showToast(`Audio: ${msg}`, 1000);
    }

    const API_URL = "http://127.0.0.1:5000";
    const nBeats = localStorage.getItem("modelCycleLength");
    const canvas = document.getElementById("circle");
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 75;

    const markers = [];
    let hoverBeat = null;
    let selectedSound = "Doom";
    let stopLoop = null;

    const pathsMap = {
        Doom: "/web/infer/sounds/doum.wav",
        "Open Tak": "/web/infer/sounds/open_tak.wav",
        "Open Tik": "/web/infer/sounds/open_tik.wav",
        // Tik1: "http://localhost:8080/sounds/tik1.wav",
        // Tik2: "http://localhost:8080/sounds/tik2.wav",
        // Ra2: "http://localhost:8080/sounds/ra.wav",
        Pa2: "/web/infer/sounds/pa2.wav",
    };

    const symbolMap = {
        Doom: "D",
        "Open Tak": "OTA",
        "Open Tik": "OTI",
        // Tik1: "T1",
        // Tik2: "T2",
        // Ra2: "RA",
        Pa2: "PA2",
        Silence: "S",
    };


    const sounds = [
        "Doom",
        "Open Tak",
        "Open Tik",
        // "Tik1",
        // "Tik2",
        // "Ra2",
        "Pa2",
        "Silence",
    ];
    const colors = {
        Doom: "#e74c3c",
        "Open Tak": "#3498db",
        "Open Tik": "#9b59b6",
        // Tik1: "#2ecc71",
        // Tik2: "#f1c40f",
        // Ra2: "#e67e22",
        Pa2: "#1abc9c",
        Silence: "#95a5a6",
    };

    // Create sound buttons
    const soundButtonsContainer = document.getElementById("sound-buttons");
    sounds.forEach((sound) => {
        const button = document.createElement("button");
        button.className = "sound-btn";
        button.innerHTML = `
            <div class="color-indicator" style="background-color: ${colors[sound]}"></div>
            ${sound}
          `;
        button.addEventListener("click", () => {
            selectedSound = sound;
            document.getElementById("currentSound").textContent = sound;

            // Update active state
            document.querySelectorAll(".sound-btn").forEach((btn) => {
                btn.classList.remove("active");
            });
            button.classList.add("active");
        });
        soundButtonsContainer.appendChild(button);
    });

    // Set the first button as active initially
    document.querySelector(".sound-btn").classList.add("active");

    function angleToBeat(angle) {
        if (angle < 0) angle += 2 * Math.PI;
        // Change to counter-clockwise by subtracting from 2π
        let beat = ((2 * Math.PI - angle) / (2 * Math.PI)) * nBeats;

        const snapSelect = document.getElementById("snapSelect");
        const snapValue = parseFloat(snapSelect.value);

        // Snap to the selected value
        beat = Math.round(beat / snapValue) * snapValue;

        return beat == nBeats ? 0 : beat;
    }

    // Convert beat to angle for drawing (counter-clockwise)
    function beatToAngle(beat) {
        // Counter-clockwise: 2π minus the clockwise angle
        return 2 * Math.PI - (beat / nBeats) * 2 * Math.PI;
    }

    function draw() {
        // Get colors from CSS variables
        const styles = getComputedStyle(document.documentElement);
        const circleColor = styles.getPropertyValue('--border-strong').trim() || '#34495e';
        const tickColor = styles.getPropertyValue('--text').trim() || '#2c3e50';
        const secondaryTickColor = styles.getPropertyValue('--error').trim() || 'red';
        const markerBorder = styles.getPropertyValue('--border-strong').trim() || '#2c3e50';
        const hoverColor = 'rgba(52, 152, 219, 0.3)';
        const hoverBorder = 'rgba(52, 152, 219, 0.7)';

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // draw circle
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = circleColor; // CHANGED
        ctx.lineWidth = 2;
        ctx.stroke();

        // draw beat ticks
        ctx.lineWidth = 1;
        for (let i = 0; i < nBeats * 2; i++) {
            const angle = beatToAngle(i / 2) - Math.PI / 2;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            ctx.moveTo(x, y);
            ctx.beginPath();

            if (i % 2 === 0) {
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.strokeStyle = tickColor; // CHANGED
            } else {
                ctx.arc(x, y, 3, 0, 2 * Math.PI);
                ctx.strokeStyle = secondaryTickColor; // CHANGED
            }
            ctx.stroke();
        }

        markers.forEach((m) => {
            const angle = beatToAngle(m.beat) - Math.PI / 2;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);

            ctx.save();
            ctx.beginPath();

            if (m.active) {
                // glow / highlight effect
                ctx.shadowBlur = 20;
                ctx.shadowColor = colors[m.sound];
                ctx.fillStyle = colors[m.sound];
                ctx.arc(x, y, 8, 0, 2 * Math.PI);
            } else {
                ctx.fillStyle = colors[m.sound];
                ctx.arc(x, y, 6, 0, 2 * Math.PI);
            }

            ctx.fill();
            ctx.strokeStyle = "#2c3e50";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
        });


        // draw hover
        if (hoverBeat !== null) {
            const angle = beatToAngle(hoverBeat) - Math.PI / 2;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = hoverColor;
            ctx.fill();
            ctx.strokeStyle = hoverBorder;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    function animate() {
        draw();
        requestAnimationFrame(animate);
    }
    animate();

    // mouse events
    canvas.addEventListener("mousemove", (e) => {
        const tooltip = document.getElementById("tooltip");
        const rect = canvas.getBoundingClientRect();

        // Position tooltip relative to the canvas
        tooltip.style.left = rect.left + e.offsetX + 15 + "px";
        tooltip.style.top = rect.top + e.offsetY + 15 + "px";

        const x = e.offsetX - cx;
        const y = e.offsetY - cy;
        const angle = Math.atan2(y, x) + Math.PI / 2; // shift bottom=0
        hoverBeat = angleToBeat(angle);

        tooltip.textContent = "Beat: " + hoverBeat.toFixed(2);
        tooltip.style.display = "block";

        draw();
    });

    canvas.addEventListener("mouseleave", () => {
        hoverBeat = null;
        document.getElementById("tooltip").style.display = "none";
        draw();
    });

    canvas.addEventListener("click", (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - cx;
        const y = e.clientY - rect.top - cy;
        const angle = Math.atan2(y, x) + Math.PI / 2;
        let beat = angleToBeat(angle);
        for (let i = 0; i < markers.length; i++) {
            if (markers[i].beat === beat) {
                markers.splice(i, 1);
                break;
            }
        }
        markers.push({ beat, sound: selectedSound, active: false });
        draw();
    });

    // ===== FIXED AUDIO SYSTEM =====

    let audioCtx = null;
    let buffers = {};
    let audioInitialized = false;

    // Initialize audio context on first user interaction
    function initAudio() {
        if (!audioCtx) {
            try {
                audioCtx = new(window.AudioContext || window.webkitAudioContext)();
                debugAudio("AudioContext created");
            } catch (e) {
                debugAudio("Failed to create AudioContext:", e);
                showToast("Audio not supported in this browser", 3000);
                return null;
            }
        }
        return audioCtx;
    }

    // Load a single audio file
    async function loadAudioFile(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            return arrayBuffer;
        } catch (e) {
            debugAudio(`Failed to load ${url}:`, e);
            return null;
        }
    }

    // Decode audio data
    async function decodeAudioData(arrayBuffer, ctx) {
        try {
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            return audioBuffer;
        } catch (e) {
            debugAudio("Error decoding audio:", e);
            return null;
        }
    }

    // Load a single WAV buffer
    async function loadWavBuffer(filePath) {
        const ctx = initAudio();
        if (!ctx) return null;

        const arrayBuffer = await loadAudioFile(filePath);
        if (arrayBuffer) {
            const audioBuffer = await decodeAudioData(arrayBuffer, ctx);
            return audioBuffer;
        }
        return null;
    }

    // Load all buffers
    async function loadAllBuffers() {
        debugAudio("Starting to load audio buffers...");

        const loadingPromises = [];
        for (const key in pathsMap) {
            debugAudio(`Loading: ${key}`);
            loadingPromises.push(
                loadWavBuffer(pathsMap[key]).then(buffer => {
                    if (buffer) {
                        buffers[key] = buffer;
                        debugAudio(`✓ Loaded: ${key}`);
                    } else {
                        debugAudio(`✗ Failed to load: ${key}`);
                    }
                })
            );
        }

        await Promise.all(loadingPromises);
        debugAudio("Finished loading buffers", Object.keys(buffers));

        const loadedCount = Object.keys(buffers).length;
        const totalCount = Object.keys(pathsMap).length;

        if (loadedCount === totalCount) {
            debugAudio("All audio files loaded successfully");
        } else {
            showToast(`Loaded ${loadedCount}/${totalCount} audio files`, 3000);
        }
    }

    // Initialize audio when user interacts with the page
    document.addEventListener('click', () => {
        if (!audioInitialized) {
            audioInitialized = true;
            debugAudio("Initializing audio on first click...");
            loadAllBuffers();
        }
    }, { once: true });

    // Also try to load on page load
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (!audioInitialized) {
                debugAudio("Auto-initializing audio on page load...");
                audioInitialized = true;
                loadAllBuffers();
            }
        }, 1000);
    });

    // Test audio function (add this button to your HTML)
    if (!document.getElementById('testAudio')) {
        const testBtn = document.createElement('button');
        testBtn.id = 'testAudio';
        testBtn.textContent = 'Test Audio';
        testBtn.style.cssText = `
            position: fixed; 
            bottom: 10px; 
            right: 10px; 
            z-index: 10000; 
            padding: 5px 10px; 
            background: #666; 
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        document.body.appendChild(testBtn);

        testBtn.addEventListener('click', async () => {
            const ctx = initAudio();
            if (!ctx) {
                showToast("AudioContext not available", 2000);
                return;
            }

            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            // Test with oscillator
            const oscillator = ctx.createOscillator();
            oscillator.connect(ctx.destination);
            oscillator.frequency.value = 440;
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.5);

            showToast("Audio test: 440Hz tone", 1000);
        });
    }

    // ===== CIRCLE EDITOR PLAYBACK =====
    document.getElementById("playSkeleton").addEventListener("click", async (e) => {
        const ctx = initAudio();
        if (!ctx) {
            showToast("Audio not available", 2000);
            return;
        }

        if (ctx.state === "suspended") {
            try {
                await ctx.resume();
                debugAudio("AudioContext resumed");
            } catch (e) {
                debugAudio("Failed to resume AudioContext:", e);
                showToast("Audio playback failed", 2000);
                return;
            }
        }

        if (!stopLoop) {
            // Check if all buffers are loaded
            const loadedCount = Object.keys(buffers).length;
            const expectedCount = Object.keys(pathsMap).length;

            if (loadedCount < expectedCount) {
                showToast(`Loading audio... (${loadedCount}/${expectedCount})`, 2000);
                debugAudio("Buffers not fully loaded");
                return;
            }

            const bpm = Number(localStorage.getItem("modelTempo"));
            const cycleLength = Number(localStorage.getItem("modelCycleLength"));

            if (!bpm || !cycleLength) {
                showToast("Please set tempo and cycle length first", 2000);
                return;
            }

            stopLoop = await playAudio(bpm, cycleLength, buffers, ctx);
            e.target.textContent = "Stop";
        } else {
            clearInterval(stopLoop);
            stopLoop = null;
            e.target.textContent = "Play";
        }
    });

    async function playAudio(bpm, cycleLength, buffers, audioCtx) {
        const beatLength = 60 / bpm;
        const cycleDuration = cycleLength * beatLength;
        const startTime = audioCtx.currentTime;

        function scheduleCycle(cycleStart) {
            for (const hit of markers) {
                const sound = buffers[hit.sound];
                if (!sound) {
                    debugAudio(`Missing buffer for: ${hit.sound}`);
                    continue;
                }

                const timeOffset = hit.beat * beatLength;
                const playTime = cycleStart + timeOffset;

                const source = audioCtx.createBufferSource();
                source.buffer = sound;
                source.connect(audioCtx.destination);

                try {
                    source.start(playTime);
                    debugAudio(`Playing ${hit.sound} at beat ${hit.beat}`);
                } catch (e) {
                    debugAudio(`Failed to play ${hit.sound}:`, e);
                }

                const now = audioCtx.currentTime;
                const delay = (playTime - now) * 1000;
                setTimeout(() => {
                    hit.active = true;
                    setTimeout(() => (hit.active = false), 150);
                }, delay);
            }
        }

        scheduleCycle(startTime);

        return setInterval(() => {
            const cycleStart = audioCtx.currentTime;
            scheduleCycle(cycleStart);
        }, cycleDuration * 1000);
    }

    function getSkeletonFromMarkers(markers) {
        let sorted = markers.sort((a, b) => a.beat - b.beat);

        let output = [];
        let old_beat = 0;
        for (const { beat, sound } of sorted) {
            let new_beat = beat - old_beat;
            output.push([new_beat, symbolMap[sound]]);
            old_beat = beat;
        }
        output[0][0] = nBeats - markers[markers.length - 1].beat + output[0][0];
        return output;
    }

    // ===== REST OF YOUR CODE CONTINUES HERE =====
    // Clear markers functionality
    document.getElementById('clearMarkers').addEventListener('click', () => {
        // [Keep your existing clear markers code...]
    });
    // Clear markers functionality
    document.getElementById('clearMarkers').addEventListener('click', () => {
        // Check if markers exist
        if (markers.length === 0) {
            showToast("No markers to clear", 2000);
            return;
        }

        // Optional: Add confirmation for many markers
        if (markers.length > 5) {
            if (!confirm(`Clear all ${markers.length} markers?`)) {
                return;
            }
        }

        // Clear the markers array
        const markerCount = markers.length;
        markers.length = 0;

        // Redraw the canvas
        draw();

        // If audio is playing, stop it
        if (stopLoop) {
            clearInterval(stopLoop);
            stopLoop = null;
            const playBtn = document.getElementById('playSkeleton');
            playBtn.textContent = "Play";
        }
    });
    // ===== MUSIC SHEET COMPOSITION SYSTEM =====

    let composition = []; // Array of cycles
    let currentCycleId = 0;

    // Append current markers as a new cycle
    document.getElementById('appendCycle').addEventListener('click', () => {
        if (markers.length === 0) {
            showToast("Add some markers first!", 2000);
            return;
        }

        // Create a deep copy of current markers
        const cycleMarkers = markers.map(marker => ({
            beat: marker.beat,
            sound: marker.sound,
            color: colors[marker.sound],
            symbol: symbolMap[marker.sound]
        }));

        // Add cycle to composition
        composition.push({
            id: currentCycleId++,
            markers: cycleMarkers,
            createdAt: new Date().toISOString()
        });

        // Update UI
        updateSheetStats();
        renderMusicSheet();

        showToast(`Cycle ${composition.length} added to composition`, 2000);
    });

    // Clear entire composition
    document.getElementById('clearComposition').addEventListener('click', () => {
        if (composition.length === 0) {
            showToast("Composition is already empty", 2000);
            return;
        }

        if (confirm(`Clear entire composition (${composition.length} cycles)?`)) {
            composition = [];
            currentCycleId = 0;
            updateSheetStats();
            renderMusicSheet();
            showToast("Composition cleared", 2000);
        }
    });

    // Update stats display
    function updateSheetStats() {
        document.getElementById('cycleCount').textContent = `Cycles: ${composition.length}`;

        const totalBeats = composition.length * nBeats;
        document.getElementById('totalBeats').textContent = `Total Beats: ${totalBeats}`;
    }

    // Render music sheet
    function renderMusicSheet() {
        const sheetContainer = document.getElementById('musicSheet');

        if (composition.length === 0) {
            sheetContainer.innerHTML = `
            <div class="empty-sheet">
                <div class="empty-message">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                    </svg>
                    <p>No cycles added yet</p>
                    <small>Click "Append Cycle" to add your first cycle</small>
                </div>
            </div>
        `;
            return;
        }

        let sheetHTML = '';

        composition.forEach((cycle, cycleIndex) => {
            const cycleNumber = cycleIndex + 1;
            const sortedMarkers = [...cycle.markers].sort((a, b) => a.beat - b.beat);

            sheetHTML += `
            <div class="cycle-display" data-cycle-id="${cycle.id}" data-cycle-index="${cycleIndex}">
                <div class="cycle-header">
                    <span class="cycle-number">Cycle ${cycleNumber}</span>
                    <div class="cycle-controls">
                        <button class="cycle-play-btn" onclick="playSingleCycle(${cycleIndex})">▶ Play</button>
                        <button class="cycle-delete-btn" onclick="deleteCycle(${cycleIndex})">✕ Delete</button>
                    </div>
                </div>
                
                <!-- Beat timeline -->
                <div class="beat-timeline" style="height: 80px; position: relative;">
                    <div class="playback-progress" id="progress-${cycleIndex}" style="width: 0%;"></div>
                    ${renderBeatGrid(nBeats)}
                    ${sortedMarkers.map((marker, markerIndex) => `
                    <div class="sound-marker" 
                         data-cycle="${cycleIndex}"
                         data-beat="${marker.beat}"
                         data-sound="${marker.sound}"
                         data-marker-index="${markerIndex}"
                         style="left: ${(marker.beat / nBeats) * 100}%;
                                top: 50%;
                                background-color: ${marker.color};
                                border-color: ${getContrastColor(marker.color)};"
                         title="${marker.sound} at beat ${marker.beat.toFixed(2)}">
                        ${marker.symbol}
                    </div>
                `).join('')}
                </div>
                
                <!-- Text representation -->
                <div class="cycle-notation" style="margin-top: var(--space-sm); font-size: 0.8rem; color: var(--text-light);">
                    ${renderTextNotation(sortedMarkers)}
                </div>
            </div>
        `;
        });

        sheetContainer.innerHTML = sheetHTML;
    }

    // Render beat grid with sub-beats
    function renderBeatGrid(totalBeats) {
        let gridHTML = '';
        const subDivisions = 4; // Show quarter beats

        for (let i = 0; i <= totalBeats; i++) {
            // Main beat line
            gridHTML += `<div class="beat-line main-beat" style="left: ${(i / totalBeats) * 100}%;"></div>`;

            // Sub-beat lines (only between main beats)
            if (i < totalBeats) {
                for (let j = 1; j < subDivisions; j++) {
                    const subBeatPos = (i + (j / subDivisions)) / totalBeats;
                    gridHTML += `<div class="beat-line sub-beat" style="left: ${subBeatPos * 100}%;"></div>`;
                }
            }

            // Beat labels (every beat)
            if (i < totalBeats) {
                gridHTML += `
                <div class="beat-container" style="width: ${(1 / totalBeats) * 100}%;">
                    <div class="beat-label">${i}</div>
                </div>
            `;
            }
        }

        return gridHTML;
    }

    // Render text notation for a cycle
    function renderTextNotation(markers) {
        if (markers.length === 0) return '<em>Empty cycle</em>';

        let notation = markers.map((marker, index) => {
            const nextBeat = index < markers.length - 1 ? markers[index + 1].beat : nBeats;
            const duration = nextBeat - marker.beat;
            return `${marker.symbol}(${duration.toFixed(2)})`;
        }).join(' → ');

        return notation;
    }

    // Helper function for contrasting colors
    function getContrastColor(hexColor) {
        // Simple contrast detection
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? '#000' : '#fff';
    }

    // Play single cycle
    // ===== ENHANCED PLAYBACK SYSTEM WITH VISUAL FEEDBACK =====

    // ===== ENHANCED PLAYBACK SYSTEM WITH VISUAL FEEDBACK =====

    let playback = {
        isPlaying: false,
        currentCycleIndex: 0,
        currentBeat: 0,
        startTime: null,
        interval: null,
        activeMarkers: new Set(),
        playhead: null,
        bpm: null,
        beatLength: null,
        cycleDuration: null
    };

    // Play single cycle with visual feedback
    function playSingleCycle(cycleIndex) {
        if (cycleIndex < 0 || cycleIndex >= composition.length) return;

        // Stop any existing playback
        stopPlayback();

        const cycle = composition[cycleIndex];
        playback.bpm = Number(localStorage.getItem("modelTempo"));
        playback.beatLength = 60 / playback.bpm;
        playback.cycleDuration = nBeats * playback.beatLength;
        playback.currentCycleIndex = cycleIndex;
        playback.isPlaying = true;

        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }

        // Create playhead if it doesn't exist
        if (!playback.playhead) {
            playback.playhead = document.createElement('div');
            playback.playhead.className = 'playhead';
            document.querySelector('.music-sheet').appendChild(playback.playhead);
        }

        // Highlight the playing cycle
        document.querySelectorAll('.cycle-display').forEach(cycle => {
            cycle.classList.remove('playing', 'current-cycle');
        });
        const currentCycleElement = document.querySelector(`[data-cycle-index="${cycleIndex}"]`);
        if (currentCycleElement) {
            currentCycleElement.classList.add('playing', 'current-cycle');
        }

        // Start playback
        playback.startTime = audioCtx.currentTime;
        scheduleCyclePlayback(cycle, cycleIndex, 0);

        // Start visual updates
        playback.interval = setInterval(updateVisualPlayback, 16);

        // Update button text
        const playBtn = document.getElementById('playComposition');
        if (playBtn) playBtn.textContent = "⏹ Stop";

        showToast(`Playing cycle ${cycleIndex + 1}`, playback.cycleDuration * 1000);
    }

    // Play entire composition with visual feedback
    document.getElementById('playComposition').addEventListener('click', async function() {
        if (playback.isPlaying) {
            stopPlayback();
            this.textContent = "▶ Play All";
            return;
        }

        if (composition.length === 0) {
            showToast("No cycles in composition", 2000);
            return;
        }

        if (audioCtx.state === "suspended") {
            await audioCtx.resume();
        }

        // Initialize playback state
        playback.bpm = Number(localStorage.getItem("modelTempo"));
        playback.beatLength = 60 / playback.bpm;
        playback.cycleDuration = nBeats * playback.beatLength;
        playback.currentCycleIndex = 0;
        playback.currentBeat = 0;
        playback.isPlaying = true;
        playback.startTime = audioCtx.currentTime;

        // Create playhead if it doesn't exist
        if (!playback.playhead) {
            playback.playhead = document.createElement('div');
            playback.playhead.className = 'playhead';
            document.querySelector('.music-sheet').appendChild(playback.playhead);
        }

        // Clear previous visual states
        clearAllHighlights();

        // Start visual updates
        playback.interval = setInterval(updateVisualPlayback, 16);

        // Schedule all cycles
        composition.forEach((cycle, cycleIndex) => {
            const startOffset = cycleIndex * playback.cycleDuration;
            scheduleCyclePlayback(cycle, cycleIndex, startOffset);
        });

        // Update button
        this.textContent = "⏹ Stop";

        const totalDuration = composition.length * playback.cycleDuration;
        showToast(`Playing ${composition.length} cycles`, totalDuration * 1000);

        // Auto-stop at end
        setTimeout(() => {
            if (playback.isPlaying) {
                stopPlayback();
            }
        }, totalDuration * 1000 + 100);
    });

    // Schedule audio and visual events for a cycle
    function scheduleCyclePlayback(cycle, cycleIndex, startOffset) {
        const ctx = initAudio();
        if (!ctx) {
            showToast("Audio not available", 2000);
            return;
        }

        cycle.markers.forEach(marker => {
            const playTime = playback.startTime + startOffset + (marker.beat * playback.beatLength);
            const delay = (playTime - ctx.currentTime) * 1000;

            // Schedule audio
            const soundBuffer = buffers[marker.sound];
            if (soundBuffer) {
                const source = ctx.createBufferSource();
                source.buffer = soundBuffer;
                source.connect(ctx.destination);

                try {
                    source.start(playTime);
                    debugAudio(`Composition: ${marker.sound} at beat ${marker.beat}`);
                } catch (e) {
                    debugAudio(`Failed to schedule ${marker.sound}:`, e);
                }
            } else {
                debugAudio(`Missing buffer for: ${marker.sound}`);
            }

            // Schedule visual highlight
            setTimeout(() => {
                if (playback.isPlaying) {
                    highlightMarker(cycleIndex, marker.beat, marker.sound);

                    document.querySelectorAll('.cycle-display').forEach(cycleEl => {
                        cycleEl.classList.remove('current-cycle');
                    });
                    const currentCycleEl = document.querySelector(`[data-cycle-index="${cycleIndex}"]`);
                    if (currentCycleEl) {
                        currentCycleEl.classList.add('current-cycle');
                    }
                }
            }, delay);
        });
    }

    // Update visual playback (playhead, progress bars)
    function updateVisualPlayback() {
        if (!playback.isPlaying || !playback.startTime) return;

        const elapsed = audioCtx.currentTime - playback.startTime;
        const totalCompositionDuration = composition.length * playback.cycleDuration;

        // Update playhead position
        if (playback.playhead) {
            const playheadPos = (elapsed / totalCompositionDuration) * 100;
            playback.playhead.style.left = `${Math.min(100, Math.max(0, playheadPos))}%`;
        }

        // Update cycle progress bars
        composition.forEach((cycle, cycleIndex) => {
            const cycleStart = cycleIndex * playback.cycleDuration;
            const cycleEnd = cycleStart + playback.cycleDuration;

            if (elapsed >= cycleStart && elapsed <= cycleEnd) {
                const cycleProgress = ((elapsed - cycleStart) / playback.cycleDuration) * 100;
                const progressBar = document.getElementById(`progress-${cycleIndex}`);
                if (progressBar) {
                    progressBar.style.width = `${cycleProgress}%`;
                }

                // Update current beat
                playback.currentBeat = ((elapsed - cycleStart) / playback.beatLength) % nBeats;
                playback.currentCycleIndex = cycleIndex;
            } else if (elapsed > cycleEnd) {
                // Fill completed cycles
                const progressBar = document.getElementById(`progress-${cycleIndex}`);
                if (progressBar) {
                    progressBar.style.width = '100%';
                }
            }
        });

        // Auto-clear highlights after they've passed
        playback.activeMarkers.forEach(markerId => {
            const marker = document.querySelector(`[data-marker-id="${markerId}"]`);
            if (marker) {
                const cycleIndex = parseInt(marker.dataset.cycle);
                const beat = parseFloat(marker.dataset.beat);
                const markerTime = (cycleIndex * playback.cycleDuration) + (beat * playback.beatLength);

                if (elapsed > markerTime + 0.2) {
                    marker.classList.remove('playing');
                    marker.classList.add('played');
                    playback.activeMarkers.delete(markerId);

                    setTimeout(() => {
                        marker.classList.remove('played');
                    }, 1000);
                }
            }
        });
    }

    // Highlight a specific marker
    function highlightMarker(cycleIndex, beat, sound) {
        const markerId = `${cycleIndex}-${beat}-${sound}`;

        const marker = document.querySelector(`[data-cycle="${cycleIndex}"][data-beat="${beat}"][data-sound="${sound}"]`);

        if (marker) {
            marker.classList.add('playing');
            marker.classList.remove('played');
            marker.setAttribute('data-marker-id', markerId);

            playback.activeMarkers.add(markerId);

            if (cycleIndex === playback.currentCycleIndex) {
                marker.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }

    // Clear all visual highlights
    function clearAllHighlights() {
        document.querySelectorAll('.sound-marker').forEach(marker => {
            marker.classList.remove('playing', 'played');
        });

        document.querySelectorAll('.cycle-display').forEach(cycle => {
            cycle.classList.remove('playing', 'current-cycle');
        });

        document.querySelectorAll('.playback-progress').forEach(progress => {
            progress.style.width = '0%';
        });

        if (playback.playhead) {
            playback.playhead.style.left = '-100px';
        }

        playback.activeMarkers.clear();
    }

    // Stop playback
    function stopPlayback() {
        if (!playback.isPlaying) return;

        playback.isPlaying = false;
        playback.currentCycleIndex = 0;
        playback.currentBeat = 0;

        if (playback.interval) {
            clearInterval(playback.interval);
            playback.interval = null;
        }

        clearAllHighlights();

        const playBtn = document.getElementById('playComposition');
        if (playBtn) playBtn.textContent = "▶ Play All";

        showToast("Playback stopped", 2000);
    }

    // Add marker mouseover effect for preview
    function addMarkerPreviewEvents() {
        document.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('sound-marker') && !playback.isPlaying) {
                const marker = e.target;
                marker.style.transform = 'translate(-50%, -50%) scale(1.2)';
                marker.style.zIndex = '4';
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('sound-marker') && !playback.isPlaying) {
                const marker = e.target;
                marker.style.transform = 'translate(-50%, -50%) scale(1)';
                marker.style.zIndex = '2';
            }
        });

        // Click on marker to preview sound
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('sound-marker') && !playback.isPlaying) {
                const marker = e.target;
                const sound = marker.dataset.sound;
                const buffer = buffers[sound];

                if (buffer && audioCtx) {
                    if (audioCtx.state === "suspended") {
                        audioCtx.resume();
                    }

                    const source = audioCtx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioCtx.destination);
                    source.start();

                    marker.classList.add('playing');
                    setTimeout(() => {
                        marker.classList.remove('playing');
                    }, 300);
                }
            }
        });
    }

    // Initialize marker preview events
    addMarkerPreviewEvents();

    // Delete a specific cycle
    function deleteCycle(cycleIndex) {
        if (cycleIndex < 0 || cycleIndex >= composition.length) return;

        const cycleNumber = cycleIndex + 1;
        if (confirm(`Delete cycle ${cycleNumber}?`)) {
            composition.splice(cycleIndex, 1);
            updateSheetStats();
            renderMusicSheet();
            showToast(`Cycle ${cycleNumber} deleted`, 2000);
        }
    }

    // Make functions available globally for inline onclick handlers
    window.stopPlayback = stopPlayback;
    window.playSingleCycle = playSingleCycle;
    window.deleteCycle = deleteCycle;

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to append
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('appendCycle').click();
        }

        // Space or Escape to stop playback
        if ((e.key === ' ' || e.key === 'Escape') && playback.isPlaying) {
            e.preventDefault();
            stopPlayback();
        }
    });

    // Auto-save composition to localStorage
    function autoSaveComposition() {
        localStorage.setItem('darbakeComposition', JSON.stringify({
            composition,
            currentCycleId,
            savedAt: new Date().toISOString()
        }));
    }

    // Load saved composition
    function loadSavedComposition() {
        const saved = localStorage.getItem('darbakeComposition');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                composition = data.composition || [];
                currentCycleId = data.currentCycleId || 0;
                updateSheetStats();
                renderMusicSheet();
                showToast("Composition loaded from last session", 2000);
            } catch (e) {
                console.error("Failed to load composition:", e);
            }
        }
    }

    // Call this on page load
    loadSavedComposition();

    // Auto-save when composition changes
    const originalPush = Array.prototype.push;
    Array.prototype.push = function() {
        const result = originalPush.apply(this, arguments);
        if (this === composition) {
            autoSaveComposition();
        }
        return result;
    };
}