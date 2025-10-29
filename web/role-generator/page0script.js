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
            if (isNaN(inp.value)) {
                showToast("Only enter numbers!");
                isOkay = false;
                return;
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
            localStorage.setItem("currPage", 2);
            document.getElementById("dummy").click();
        }
    });
}