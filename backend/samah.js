const express = require('express');
const cors = require('cors');
const chatwithvision = require('./chatwithvision');
const chat = require('./chat');
const squidswap = require('./squidswap');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3200;

app.use(cors());
app.use(express.json());

app.use('/', chatwithvision);
app.use('/', chat);
app.use('/', squidswap);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
