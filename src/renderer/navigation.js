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

  document.getElementById("next-btn").addEventListener("click", () => {
    switch (pageId) {
      case 0:
        // assert all inputs
        const inputs = document.querySelectorAll(".step_1_input > input");
        for (const inp of inputs) {
          if (!inp.value || inp.value.trim().length === 0) {
            alert("All inputs are required!");
            return;
          }
          switch (inp.name) {
            case "tempo":
              inp.value = Number(inp.value);
              if (inp.value < 50 || inp.value > 150) {
                alert("Tempo must between 50 and 150 BPM!");
                return;
              }
              localStorage.setItem("tempo", inp.value);
              break;
            default:
              if (isNaN(inp.value)) {
                alert("Only enter numbers!");
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
    const nextPage = (pageId + 1) % 2;
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
