export function page0script() {
    function showToast(message, duration = 3000) {
        let container = document.getElementById("toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            document.body.appendChild(container);
        }

        // Remove all inline styles and let CSS handle it
        const toast = document.createElement("div");
        toast.textContent = message;
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
    const inputs = document.querySelectorAll(".step_1_input > input");
    for (const inp of inputs) {
        let stored = localStorage.getItem(inp.name);
        if (stored) {
            inp.value = stored;
        }
    }

    document.getElementById("next-btn1").addEventListener("click", () => {
        let isOkay = true;
        for (const inp of inputs) {
            if (!inp.value || inp.value.trim().length === 0) {
                showToast("All inputs are required!");
                isOkay = false;
                return;
            }
            if (isNaN(inp.value) || Number(inp.value) < 0) {
                showToast("Only enter positive numbers!");
                isOkay = false;
                return;
            }
            if (inp.name === "maxSubd") {
                if (Number(inp.value) > 16) {
                    showToast("Maximum subdivision must be <= 16");
                    isOkay = false;
                    return;
                }
            }

            if (inp.name === "std") {
                if (Number(inp.value) > 100) {
                    showToast("Quantization must be <= 100");
                    isOkay = false;
                    return;
                }
            }
            localStorage.setItem(inp.name, inp.value);
        }
        if (isOkay) {
            localStorage.setItem("currPage", 1);
            document.getElementById("dummy").click();
        }
    });
    document.getElementById("next-btn2").addEventListener("click", () => {
        let isOkay = true;
        for (const inp of inputs) {
            if (!inp.value || inp.value.trim().length === 0) {
                showToast("All inputs are required!");
                isOkay = false;
                return;
            }
            if (isNaN(inp.value)) {
                showToast("Only enter numbers!");
                isOkay = false;
                return;
            }
            localStorage.setItem(inp.name, inp.value);

        }
        if (isOkay) {
            function getMatrix() {
                const maxsubd = Number(localStorage.getItem("maxSubd"));
                const matrix_inputs = [];
                let k = -1;
                for (let i = 0; i < maxsubd * 5; i++) {
                    if (i % maxsubd === 0) {
                        matrix_inputs.push([]);
                        k++;
                    }
                    let valuetopush = 0
                    matrix_inputs[k].push(valuetopush);
                }
                return matrix_inputs;
            }
            const matrix = localStorage.getItem("matrix");
            if (!matrix) localStorage.setItem("matrix", JSON.stringify(getMatrix()));
            localStorage.setItem("currPage", 2);
            document.getElementById("dummy").click();
        }
    });
}