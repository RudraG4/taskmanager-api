const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require("dotenv").config();

const tasks = require("./routes/tasks");  //Task Routes
const { rLog, eLog, nLog } = require('./util/rlogger'); //Simple Colored Loggers
const { connectDB, disconnectDB } = require('./database/connection');
const { marked } = require('marked');  //Markdown parser

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(rLog);

app.use("/api/v1/tasks", tasks);

app.get("/", async (req, res) => {
    const readmePath = require("path").resolve(__dirname, "README.md");
    await require('fs').readFile(readmePath, (err, data) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.status(200).send(marked.parse(data.toString()));
    });
});

const run = async () => {
    try {
        await connectDB();
        app.listen(port, nLog(`Server is listening on port ${port}`));
    } catch (e) {
        eLog("Error connecting.. " + e);
    }
}

run();

process.on('beforeExit', disconnectDB);
process.on('SIGINT', disconnectDB);