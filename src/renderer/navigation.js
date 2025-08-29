// --- Toast container ---
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

const rowLabels = [
  "Doom",
  "Open Tak",
  "Open Tik",
  "Tik1",
  "Tik2",
  "Ra2",
  "Pa2",
];

function fillMatrix(m) {
  for (let i = 0; i < m.length; i++) {
    let lastValue = 0;
    for (let j = 0; j < m[0].length; j++) {
      if (m[i][j]) lastValue = m[i][j];
      else m[i][j] = lastValue;
    }
  }
}

function renderPage(pageId) {
  const container = document.getElementById("main_content");
  container.innerHTML = "";

  const tpl = document.getElementById(`page-${pageId}`);
  container.appendChild(tpl.content.cloneNode(true));

  if (pageId === 1) {
    const maxSubd = Number(localStorage.getItem("maxSubd"));
    generateMatrix(maxSubd);
  }

  if (pageId === 2) {
    const numb_beats = localStorage.getItem("cycleLength");
    page2script(numb_beats);
  }

  document.getElementById("next-btn").addEventListener("click", () => {
    switch (pageId) {
      case 0:
        // assert all inputs
        const inputs = document.querySelectorAll(".step_1_input > input");
        for (const inp of inputs) {
          if (!inp.value || inp.value.trim().length === 0) {
            showToast("All inputs are required!");
            return;
          }
          switch (inp.name) {
            case "tempo":
              inp.value = Number(inp.value);
              if (inp.value < 50 || inp.value > 150) {
                showToast("Tempo must between 50 and 150 BPM!");
                return;
              }
              localStorage.setItem("tempo", inp.value);
              break;
            default:
              if (isNaN(inp.value)) {
                showToast("Only enter numbers!");
                return;
              }
              localStorage.setItem(inp.name, inp.value);
              break;
          }
        }
        break;
      case 1:
        const matrix_inputs_raw = document.querySelectorAll(".step_2_input");
        const maxsubd = Number(localStorage.getItem("maxSubd"));
        const matrix_inputs = [];
        k = -1;
        for (let i = 0; i < matrix_inputs_raw.length; i++) {
          if (i % maxsubd === 0) {
            matrix_inputs.push([]);
            k++;
          }
          matrix_inputs[k].push(
            isNaN(matrix_inputs_raw[i].value)
              ? undefined
              : Math.abs(Number(matrix_inputs_raw[i].value))
          );
        }
        // fill missing values easy 230 problem
        fillMatrix(matrix_inputs);
        localStorage.setItem("matrix", JSON.stringify(matrix_inputs));
        break;
      default:
        break;
    }
    const nextPage = (pageId + 1) % 3;
    localStorage.setItem("currPage", nextPage);
    renderPage(nextPage);
  });
}

function generateMatrix(nb_cols) {
  const rows = rowLabels.length;
  const cols = nb_cols;
  const container = document.getElementById("matrix");
  container.innerHTML = "";

  container.className = "matrix";
  container.style.display = "grid";
  container.style.gridTemplateColumns = `120px repeat(${cols}, 40px)`;
  container.style.gridTemplateRows = `40px repeat(${rows}, 30px)`;

  // Empty corner
  container.appendChild(document.createElement("div"));

  // Column labels
  for (let c = cols; c >= 1; c--) {
    const div = document.createElement("div");
    div.className = "col-label";
    div.textContent = c;
    container.appendChild(div);
  }

  // Rows with inputs
  for (let r = 0; r < rows; r++) {
    const label = document.createElement("div");
    label.className = "row-label";
    label.textContent = rowLabels[r];
    container.appendChild(label);

    for (let c = 0; c < cols; c++) {
      const input = document.createElement("input");
      input.type = "text";
      input.classList.add("step_2_input");
      container.appendChild(input);
    }
  }
}

document.getElementById("go_back").addEventListener("click", () => {
  localStorage.setItem("currPage", 0);
  renderPage(0);
});

// initial call
(function init() {
  let currPage = Number(localStorage.getItem("currPage")) || 0;
  renderPage(currPage);
})();

function page2script(nBeats) {
  const canvas = document.getElementById("circle");
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = 150;

  let markers = [];
  let hoverBeat = null;
  let selectedSound = "doom";

  // sound options
  const sounds = [
    "Doom",
    "Open Tak",
    "Open Tik",
    "Tik1",
    "Tik2",
    "Ra2",
    "Pa2",
    "Silence",
  ];
  const colors = {
    Doom: "#e74c3c",
    "Open Tak": "#3498db",
    "Open Tik": "#9b59b6",
    Tik1: "#2ecc71",
    Tik2: "#f1c40f",
    Ra2: "#e67e22",
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
    const snapEnabled = document.getElementById("snapCheckbox").checked;
    if (snapEnabled) beat = Math.round(beat * 4) / 4; // nearest 0.25
    return beat;
  }

  // Convert beat to angle for drawing (counter-clockwise)
  function beatToAngle(beat) {
    // Counter-clockwise: 2π minus the clockwise angle
    return 2 * Math.PI - (beat / nBeats) * 2 * Math.PI;
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "#34495e";
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
      } else {
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
      }
      ctx.strokeStyle = i % 2 === 0 ? "#2c3e50" : "red"; // Emphasize every 4th beat
      ctx.stroke();
    }

    // draw markers
    markers.forEach((m) => {
      const angle = beatToAngle(m.beat) - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, 2 * Math.PI);
      ctx.fillStyle = colors[m.sound] || "red";
      ctx.fill();
      ctx.strokeStyle = "#2c3e50";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // draw hover
    if (hoverBeat !== null) {
      const angle = beatToAngle(hoverBeat) - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(52, 152, 219, 0.3)";
      ctx.fill();
      ctx.strokeStyle = "rgba(52, 152, 219, 0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

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
    const angle = Math.atan2(y, x) + Math.PI / 2; // shift bottom=0
    let beat = angleToBeat(angle);

    markers.push({ beat, sound: selectedSound });
    draw();
  });
  draw();
}
