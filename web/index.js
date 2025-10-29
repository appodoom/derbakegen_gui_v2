// WEB SERVER WITH AUTHENTICATION

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const path = require("path");
const uuid4 = require("uuid4");
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const cookieParser = require("cookie-parser");
const { GENERATE, RATE, PAGE_404, LOGIN, WAIT_ROOM, ADMIN } = require("./paths.js");
const { validate } = require("./utils");
require("dotenv").config({ path: "../.env" });
const { Rating, Question, User, Sound, sequelize } = require("./db/schemas.js");
const { log, generatorRoleRequired, ratorRoleRequired, findRole, adminRoleRequired } = require("./middlewares");
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.S3_REGION
});

const s3 = new AWS.S3();

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

app.get('/web/api/me/', async (req, res) => {

    if (!req.cookies || !req.cookies.token) {
        res.status(403);
        res.redirect("/web/login/");
        return;
    }

    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    if (!decoded || !decoded.id) {
        res.status(403);
        res.redirect("/web/login/");
        return;
    }

    try {
        const user = await User.findOne({ where: { id: decoded.id } });
        if (!user) {
            res.status(403);
            res.redirect("/web/login/");
            return;
        }

        let out = { "username": user.username, "Logout": "/web/logout/" };
        switch (user.role) {
            case "rate":
                out["Rate"] = "/web/rate/";
                break;
            case "generate":
                out["Rate"] = "/web/rate/";
                out["Generate"] = "/web/generate/";
                break;
            case "admin":
                out["Rate"] = "/web/rate/";
                out["Generate"] = "/web/generate/";
                out["Dashboard"] = "/web/admin/";
                break;
            default:
                break;
        }

        res.status(200).json(out);

    } catch (e) {
        res.status(403);
        res.redirect("/web/login");
        return;
    }
})

app.get("/web/api/users/", adminRoleRequired, async (req, res) => {
    try {
        const users = await User.findAll();
        res.status(200).json({ users });
    } catch (e) {
        res.status(500).json({ error: "Something went wrong." });
    }
})

app.post("/web/api/rate/", ratorRoleRequired, async (req, res) => {
    try {
        const { ratings, sound } = req.body;
        const id = uuid4();
        const token = req.cookies.token;

        const { id: userid } = jwt.verify(token, process.env.SECRET_KEY);

        const rating = await Rating.create({ id, rated_by: userid, sound, ratings })

        if (!rating) {
            res.status(400).json({ error: "Something went wrong" });
            return;
        }

        res.sendStatus(200);
    } catch (e) {
        console.log(e.message);
        res.status(500).json({ error: "Something went wrong" });
    }
})


app.get("/web/api/random_audio/", ratorRoleRequired, async (req, res) => {
    try {
        const randomSound = await Sound.findOne({
            order: sequelize.random()
        });

        if (!randomSound) {
            return res.status(400).json({ error: "No available audios" });
        }

        const { url } = randomSound;

        // Extract bucket and key from S3 URL
        // URL format: https://bucket-name.s3.region.amazonaws.com/key/path/audio.wav
        const urlObj = new URL(url);
        const bucket = urlObj.hostname.split('.')[0];
        const key = urlObj.pathname.substring(1); // Remove leading slash

        const s3Object = await s3.getObject({
            Bucket: bucket,
            Key: key
        }).promise();

        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Disposition', 'inline; filename="audio.wav"');
        res.setHeader('Content-Length', s3Object.ContentLength);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Audio-ID', randomSound.id);

        res.send(s3Object.Body);

    } catch (e) {
        console.error('Error fetching random audio:', e);

        if (e.code === 'NoSuchKey') {
            return res.status(404).json({ error: "Audio file not found in S3" });
        }
        if (e.code === 'NoSuchBucket') {
            return res.status(404).json({ error: "S3 bucket not found" });
        }

        res.status(500).json({ error: "Something went wrong." });
    }
});

app.get("/web/api/questions/", ratorRoleRequired, async (req, res) => {
    try {
        const questions = await Question.findAll();
        res.status(200).json({ questions });
    } catch (e) {
        res.status(500).json({ error: "Something went wrong." });
    }
})

app.put("/web/api/questions/", adminRoleRequired, async (req, res) => {
    try {
        const questions = req.body;
        const updatePromises = Object.entries(questions).map(([id, newActive]) => {
            Question.update({ active: newActive }, { where: { id } });
        })

        await Promise.all(updatePromises);

        res.sendStatus(200);
    } catch (e) {
        res.status(500).json({ error: "Something went wrong." })
    }

})

app.post("/web/api/questions/", adminRoleRequired, async (req, res) => {
    try {
        const { question, description, active } = req.body;
        if (active === null) active = true;
        if (!validate(1, question)) {
            res.status(400);
            res.json({ error: "Please fill all required fields" });
        }

        const id = uuid4();
        const q = await Question.create({ id, question, description: description || "", active });

        if (!q) {
            throw new Error();
            return;
        }

        res.sendStatus(200);
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


app.get("/web/logout/", (req, res) => {
    res.clearCookie("token", {
        path: "/",
        sameSite: "lax",
        httpOnly: true
    });
    res.redirect("/web/login/");
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