// WEB SERVER WITH AUTHENTICATION

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const path = require("path");
const uuid4 = require("uuid4");
const jwt = require('jsonwebtoken');
const cookieParser = require("cookie-parser");
const { GENERATE, RATE, PAGE_404, LOGIN, WAIT_ROOM, ADMIN } = require("./paths.js");
const { validate } = require("./utils");
require("dotenv").config({ path: "../.env" });
const { User, sequelize } = require("./db/user_schema.js");
const { log, generatorRoleRequired, ratorRoleRequired, findRole, adminRoleRequired } = require("./middlewares");

const app = express();
app.use(cors({ origin: "*" }))
app.use(express.json())
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


app.use(log);
app.get("/web/test/", (req, res) => {
    res.sendStatus(200);
})

/*
    --------------------    API    ---------------------
*/
const cookieoptions = {
    magAge: 3 * 24 * 3600 * 1000, // 3 days
    httpOnly: true,
    path: "/", // very important
    sameSite: "lax"
}

app.get("/web/api/users/", adminRoleRequired, async (req, res) => {
    try {
        const users = await User.findAll();
        res.status(200).json({ users });
    } catch (e) {
        res.status(500).json({ error: "Something went wrong." });
    }
})

app.post("/web/api/roles/", adminRoleRequired, async (req, res) => {
    try {
        const users = req.body;
        const updatePromises = Object.entries(users).map(([id, newRole]) =>
            User.update({ role: newRole }, { where: { id } })
        );

        await Promise.all(updatePromises);

        res.sendStatus(200);
    } catch (e) {
        res.status(500).json({ error: "Something went wrong." });
    }
})


app.post("/web/api/register/", async (req, res) => {
    // register user in database with role="L"
    const { user, pass } = req.body;
    if (!validate(2, user, pass)) {
        res.status(401).json({
            error: "All fields are required"
        })
    };

    const id = uuid4();
    try {
        const hashed = await bcrypt.hash(pass, 12);
        const created = await User.create({
            id,
            username: user,
            password: hashed,
            role: "none"
        });
        if (created) {
            const token = jwt.sign({ id }, process.env.SECRET_KEY);
            res.status(200).cookie("token", token, cookieoptions); // 3 days
            return res.redirect("/web/");
        } else {
            throw new Error("");
        }
    } catch (e) {
        res.status(400).json({
            error: (e && e.message && e.message == "Validation error") ? "Username already used." : "Unexpected error. Try again."
        });
    }
})

app.post("/web/api/login/", async (req, res) => {
    const { user, pass } = req.body;
    if (!validate(2, user, pass)) {
        res.status(401).json({
            error: "All fields are required"
        });
        return;
    }

    try {
        const found = await User.findOne({ where: { username: user } });
        if (!found) {
            throw new Error("Username not found.");
        }
        const matches = await bcrypt.compare(pass, found.password);
        if (!matches) {
            throw new Error("Wrong password.");
        }
        const token = jwt.sign({ id: found.id }, process.env.SECRET_KEY);
        res.status(200).cookie("token", token, cookieoptions);
        switch (found.role) {
            case "generator":
                return res.redirect("/web/generate/");
                break;
            case "rator":
                return res.redirect("/web/rate/");
                break;
            default:
                return res.redirect("/web/");
                break;
        }
    } catch (e) {
        res.status(401).json({
            error: e.message
        })
    }
})


/*
    -------------------- WEB SERVER ---------------------
*/

app.use("/web/login/", express.static(LOGIN));
app.use("/web/generate/", generatorRoleRequired, express.static(GENERATE));
app.use("/web/rate/", ratorRoleRequired, express.static(RATE));
app.use("/web/admin/", adminRoleRequired, express.static(ADMIN));
app.use("/web/", findRole, express.static(WAIT_ROOM));

app.use("/web/404/", express.static(PAGE_404));
app.use((req, res) => {
    res.status(404).sendFile(path.join(PAGE_404, "index.html"));
});


app.listen(process.env.WEB_PORT, () => {
    console.log("Running on", process.env.WEB_PORT)
});