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
        Pa2: "/web/infer/sounds/pa2.wav",
    };

    const symbolMap = {
        Doom: "D",
        "Open Tak": "OTA",
        "Open Tik": "OTI",
        Pa2: "PA2",
        Silence: "S",
    };

    let buffers = {};

    const sounds = [
        "Doom",
        "Open Tak",
        "Open Tik",
        "Pa2",
        "Silence",
    ];
    const colors = {
        Doom: "#e74c3c",
        "Open Tak": "#3498db",
        "Open Tik": "#9b59b6",
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
        ctx.strokeStyle = circleColor;
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
                ctx.strokeStyle = tickColor;
            } else {
                ctx.arc(x, y, 3, 0, 2 * Math.PI);
                ctx.strokeStyle = secondaryTickColor;
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

    // ===== AUDIO SYSTEM =====
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Load audio buffers
    async function loadAudioFile(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            return audioBuffer;
        } catch (e) {
            console.error("Error loading audio:", e);
            return null;
        }
    }

    // Load all buffers
    async function loadAllBuffers() {
        for (const key in pathsMap) {
            const buffer = await loadAudioFile(pathsMap[key]);
            if (buffer) {
                buffers[key] = buffer;
            }
        }
    }

    // Load buffers on page load
    window.addEventListener('load', () => {
        loadAllBuffers();
    });

    // Circle editor playback
    document.getElementById("playSkeleton").addEventListener("click", async (e) => {
        if (audioCtx.state === "suspended") {
            await audioCtx.resume();
        }
        if (!stopLoop) {
            if (Object.keys(buffers).length !== Object.keys(pathsMap).length) return;

            const bpm = Number(localStorage.getItem("modelTempo"));
            const cycleLength = Number(localStorage.getItem("modelCycleLength"));
            stopLoop = await playAudio(bpm, cycleLength, buffers);
            e.target.textContent = "Stop";
        } else {
            clearInterval(stopLoop);
            stopLoop = null;
            e.target.textContent = "Play";
        }
    });

    async function playAudio(bpm, cycleLength, buffers) {
        const beatLength = 60 / bpm;
        const cycleDuration = cycleLength * beatLength;
        const startTime = audioCtx.currentTime;

        function scheduleCycle(cycleStart) {
            for (const hit of markers) {
                const sound = buffers[hit.sound];
                if (!sound) continue;

                const timeOffset = hit.beat * beatLength;
                const playTime = cycleStart + timeOffset;

                const source = audioCtx.createBufferSource();
                source.buffer = sound;
                source.connect(audioCtx.destination);
                source.start(playTime);
                
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

    // Clear markers functionality
    document.getElementById('clearMarkers').addEventListener('click', () => {
        if (markers.length === 0) {
            showToast("No markers to clear", 2000);
            return;
        }
        if (markers.length > 5 && !confirm(`Clear all ${markers.length} markers?`)) return;
        
        const markerCount = markers.length;
        markers.length = 0;
        draw();
        
        if (stopLoop) {
            clearInterval(stopLoop);
            stopLoop = null;
            document.getElementById('playSkeleton').textContent = "Play";
        }
    });

    // ===== SIMPLIFIED MUSIC SHEET SYSTEM =====
    let composition = [];
    let currentCycleId = 0;
    let playbackState = {
        isPlaying: false,
        startTime: null,
        animationFrame: null,
        currentCycle: 0,
        currentBeat: 0
    };

    // Append current markers as a new cycle
    document.getElementById('appendCycle').addEventListener('click', () => {
        if (markers.length === 0) {
            showToast("Add some markers first!", 2000);
            return;
        }

        const cycleMarkers = markers.map(marker => ({
            beat: marker.beat,
            sound: marker.sound,
            color: colors[marker.sound],
            symbol: symbolMap[marker.sound]
        }));

        composition.push({
            id: currentCycleId++,
            markers: cycleMarkers,
            createdAt: new Date().toISOString()
        });

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
            stopPlayback();
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
                    
                    <div class="cycle-notation" style="margin-top: var(--space-sm); font-size: 0.8rem; color: var(--text-light);">
                        ${renderTextNotation(sortedMarkers)}
                    </div>
                </div>
            `;
        });

        sheetContainer.innerHTML = sheetHTML;
    }

    // Render beat grid
    function renderBeatGrid(totalBeats) {
        let gridHTML = '';
        for (let i = 0; i <= totalBeats; i++) {
            gridHTML += `<div class="beat-line main-beat" style="left: ${(i / totalBeats) * 100}%;"></div>`;
            if (i < totalBeats) {
                for (let j = 1; j < 4; j++) {
                    const subBeatPos = (i + (j / 4)) / totalBeats;
                    gridHTML += `<div class="beat-line sub-beat" style="left: ${subBeatPos * 100}%;"></div>`;
                }
                gridHTML += `
                    <div class="beat-container" style="width: ${(1 / totalBeats) * 100}%;">
                        <div class="beat-label">${i}</div>
                    </div>
                `;
            }
        }
        return gridHTML;
    }

    // Render text notation
    function renderTextNotation(markers) {
        if (markers.length === 0) return '<em>Empty cycle</em>';
        return markers.map((marker, index) => {
            const nextBeat = index < markers.length - 1 ? markers[index + 1].beat : nBeats;
            const duration = nextBeat - marker.beat;
            return `${marker.symbol}(${duration.toFixed(2)})`;
        }).join(' → ');
    }

    // Helper function for contrasting colors
    function getContrastColor(hexColor) {
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? '#000' : '#fff';
    }

    // ===== SIMPLIFIED PLAYBACK SYSTEM =====

    // Play single cycle
    function playSingleCycle(cycleIndex) {
        if (cycleIndex < 0 || cycleIndex >= composition.length) return;
        stopPlayback();
        
        const bpm = Number(localStorage.getItem("modelTempo"));
        const beatLength = 60 / bpm;
        const cycle = composition[cycleIndex];
        
        playbackState.isPlaying = true;
        playbackState.startTime = audioCtx.currentTime;
        playbackState.currentCycle = cycleIndex;
        
        // Schedule audio
        scheduleCycleAudio(cycle, cycleIndex, 0, beatLength);
        
        // Start visual updates
        playbackState.animationFrame = requestAnimationFrame(() => updatePlaybackVisuals());
        
        // Update play button text
        document.getElementById('playComposition').textContent = "⏹ Stop";
        showToast(`Playing cycle ${cycleIndex + 1}`, nBeats * beatLength * 1000);
    }

    // Play entire composition
    document.getElementById('playComposition').addEventListener('click', async function() {
        if (playbackState.isPlaying) {
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

        const bpm = Number(localStorage.getItem("modelTempo"));
        const beatLength = 60 / bpm;
        const cycleDuration = nBeats * beatLength;
        
        playbackState.isPlaying = true;
        playbackState.startTime = audioCtx.currentTime;
        playbackState.currentCycle = 0;

        // Schedule all cycles
        composition.forEach((cycle, cycleIndex) => {
            const startOffset = cycleIndex * cycleDuration;
            scheduleCycleAudio(cycle, cycleIndex, startOffset, beatLength);
        });

        // Start visual updates
        playbackState.animationFrame = requestAnimationFrame(() => updatePlaybackVisuals());
        
        // Update button
        this.textContent = "⏹ Stop";
        
        const totalDuration = composition.length * cycleDuration;
        showToast(`Playing ${composition.length} cycles`, totalDuration * 1000);
        
        // Auto-stop at end
        setTimeout(() => {
            if (playbackState.isPlaying) {
                stopPlayback();
            }
        }, totalDuration * 1000 + 100);
    });

    // Schedule audio for a cycle
    function scheduleCycleAudio(cycle, cycleIndex, startOffset, beatLength) {
        cycle.markers.forEach(marker => {
            const playTime = playbackState.startTime + startOffset + (marker.beat * beatLength);
            const soundBuffer = buffers[marker.sound];
            
            if (soundBuffer) {
                const source = audioCtx.createBufferSource();
                source.buffer = soundBuffer;
                source.connect(audioCtx.destination);
                source.start(playTime);
            }
        });
    }

    // Update playback visuals (simplified)
    function updatePlaybackVisuals() {
        if (!playbackState.isPlaying || !playbackState.startTime) return;
        
        const elapsed = audioCtx.currentTime - playbackState.startTime;
        const bpm = Number(localStorage.getItem("modelTempo"));
        const beatLength = 60 / bpm;
        const cycleDuration = nBeats * beatLength;
        const totalDuration = composition.length * cycleDuration;
        
        // Update progress bars
        composition.forEach((cycle, cycleIndex) => {
            const cycleStart = cycleIndex * cycleDuration;
            const cycleEnd = cycleStart + cycleDuration;
            const progressBar = document.getElementById(`progress-${cycleIndex}`);
            
            if (progressBar) {
                if (elapsed >= cycleStart && elapsed <= cycleEnd) {
                    const cycleProgress = ((elapsed - cycleStart) / cycleDuration) * 100;
                    progressBar.style.width = `${cycleProgress}%`;
                    playbackState.currentCycle = cycleIndex;
                    
                    // Highlight markers in current cycle
                    updateMarkerHighlights(cycle, cycleIndex, elapsed - cycleStart, beatLength);
                } else if (elapsed > cycleEnd) {
                    progressBar.style.width = '100%';
                } else {
                    progressBar.style.width = '0%';
                }
            }
        });
        
        // Clear highlights from other cycles
        clearAllHighlightsExcept(playbackState.currentCycle);
        
        // Continue animation
        if (playbackState.isPlaying) {
            playbackState.animationFrame = requestAnimationFrame(() => updatePlaybackVisuals());
        }
    }

    // Update marker highlights for a specific cycle
    function updateMarkerHighlights(cycle, cycleIndex, elapsedInCycle, beatLength) {
        cycle.markers.forEach(marker => {
            const markerEl = document.querySelector(`[data-cycle="${cycleIndex}"][data-beat="${marker.beat}"][data-sound="${marker.sound}"]`);
            if (markerEl) {
                const markerTime = marker.beat * beatLength;
                const timeDiff = Math.abs(elapsedInCycle - markerTime);
                
                // Highlight marker if we're within 0.1 seconds of it
                if (timeDiff < 0.1) {
                    markerEl.classList.add('playing');
                } else {
                    markerEl.classList.remove('playing');
                }
            }
        });
    }

    // Clear all highlights except current cycle
    function clearAllHighlightsExcept(exceptCycleIndex) {
        document.querySelectorAll('.sound-marker').forEach(marker => {
            const cycleIndex = parseInt(marker.dataset.cycle);
            if (cycleIndex !== exceptCycleIndex) {
                marker.classList.remove('playing');
            }
        });
    }

    // Stop playback
    function stopPlayback() {
        if (!playbackState.isPlaying) return;
        
        playbackState.isPlaying = false;
        playbackState.startTime = null;
        
        if (playbackState.animationFrame) {
            cancelAnimationFrame(playbackState.animationFrame);
            playbackState.animationFrame = null;
        }
        
        // Clear all highlights
        document.querySelectorAll('.sound-marker').forEach(marker => {
            marker.classList.remove('playing');
        });
        
        // Reset progress bars
        composition.forEach((_, cycleIndex) => {
            const progressBar = document.getElementById(`progress-${cycleIndex}`);
            if (progressBar) {
                progressBar.style.width = '0%';
            }
        });
        
        // Reset button
        document.getElementById('playComposition').textContent = "▶ Play All";
    }

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

    // Make functions available globally
    window.playSingleCycle = playSingleCycle;
    window.deleteCycle = deleteCycle;

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('appendCycle').click();
        }
        if ((e.key === ' ' || e.key === 'Escape') && playbackState.isPlaying) {
            e.preventDefault();
            stopPlayback();
        }
    });

    // Initialize
    loadAllBuffers();
}