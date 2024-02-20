const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');
const pdfParse = require('pdf-parse');

// Setup CORS options
const corsOptions = {
    origin: true
};

app.use(cors(corsOptions));

// Use Express's built-in JSON parser middleware
app.use(express.json());

app.post('/extract-pdf-text', async (req, res) => {
    console.log("Incoming request to /extract-pdf-text");
    try {
        const pdfUrl = req.body.url;
        // Use dynamic import for 'node-fetch'
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        const response = await fetch(pdfUrl);

        // In modern versions of node-fetch, use response.buffer() to get a Buffer directly
        const data = await response.buffer();
        
        pdfParse(data).then(function(data) {
            res.send({ text: data.text });
        });
    } catch(error) {
        console.error("Error processing the request:", error);
        res.status(500).send("Something went wrong");
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
