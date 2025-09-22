export async function page3script() {
    const body = JSON.stringify({
        cycleLength: localStorage.getItem("cycleLength"),
        matrix: localStorage.getItem("matrix"),
        maxSubd: localStorage.getItem("maxSubd"),
        numOfCycles: localStorage.getItem("numOfCycles"),
        std: localStorage.getItem("std"),
        tempo: localStorage.getItem("tempo"),
        tempoVariation: localStorage.getItem("tempoVariation"),
        skeleton: localStorage.getItem("skeleton"),
    });

    const audioContainer = document.getElementById("audio-container");

    try {
        audioContainer.innerHTML = `<div class="loading">Loading audio...</div>`;

        const res = await fetch("http://10.169.11.220:5000/", {
            method: "POST",
            body,
            headers: {
                "Content-Type": "application/json",
            },
        });

        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        const audioEl = document.createElement("audio");
        audioEl.setAttribute("controls", "true");

        const source = document.createElement("source");
        source.src = audioUrl;
        source.type = "audio/wav";

        audioEl.appendChild(source);
        audioEl.load();

        audioContainer.innerHTML = "";
        audioContainer.appendChild(audioEl);
    } catch (err) {
        audioContainer.innerHTML = `<div class="error">Failed to load audio</div>`;
        console.error("Audio fetch error:", err);
    }

    const backBtn = document.querySelector("#next-btn");
    backBtn.addEventListener("click", () => {
        localStorage.setItem("currPage", 0);
        document.getElementById("dummy").click();
    });
}