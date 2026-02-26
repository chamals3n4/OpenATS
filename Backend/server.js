const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pool = require("./db");
const fs = require("fs");
const app = express();

app.use(cors());
app.use(express.json());

if (!fs.existsSync("uploads")) { fs.mkdirSync("uploads"); }

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage: storage });

app.get("/jobs", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM jobs ORDER BY id ASC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
});

app.post("/apply", upload.single("resume"), async (req, res) => {
    try {
        const { job_id, first_name, last_name, email, phone } = req.body;
        const resume_filename = req.file ? req.file.filename : null;

        await pool.query(
            "INSERT INTO applications (job_id, first_name, last_name, email, phone, resume_filename) VALUES ($1, $2, $3, $4, $5, $6)",
            [job_id, first_name, last_name, email, phone, resume_filename]
        );

        const jobResult = await pool.query("SELECT success_msg FROM jobs WHERE id = $1", [job_id]);
        res.send(jobResult.rows[0].success_msg);
    } catch (err) {
        console.error("DB Error:", err.message);
        res.status(500).send("Database Error: " + err.message);
    }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));