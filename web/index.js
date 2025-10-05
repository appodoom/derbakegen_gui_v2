// WEB SERVER WITH AUTHENTICATION

const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: "../.env" });
const path = require("path");
const app = express();
const { GENERATE, RATE, PAGE_404 } = require("./paths.js");

app.use(cors({ origin: "*" }))


app.get("/web/test/", (req, res) => {
    res.sendStatus(200);
})

// webserver with authentication - role based rendering
app.use("/web/generate/", express.static(GENERATE));
app.use("/web/rate/", express.static(RATE));

app.use("/web/404/", express.static(PAGE_404, { index: false }));
app.use((req, res) => {
    res.status(404).sendFile(path.join(PAGE_404, "index.html"));
});

app.listen(process.env.WEB_PORT, () => {
    console.log("Running on", process.env.WEB_PORT)
})