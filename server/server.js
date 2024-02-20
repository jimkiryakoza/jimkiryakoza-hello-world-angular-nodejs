const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');
const PDFParser = require('pdf2json'); // Import pdf2json

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
        const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
        const response = await fetch(pdfUrl);

        // Use response.arrayBuffer() and convert it to Buffer
        const arrayBuffer = await response.arrayBuffer();
        const data = Buffer.from(arrayBuffer);

        const pdfParser = new PDFParser(this,1); // Create a new instance of PDFParser
        pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
        pdfParser.on("pdfParser_dataReady", pdfData => {
            // Assuming you want to extract text and send it in the response
            // You might need to adjust how you extract and send text based on pdf2json's output structure
            const pdfText =  pdfParser.getRawTextContent();
            res.send({ text: pdfText });
        });
        pdfParser.parseBuffer(data); // Parse the PDF buffer
    } catch (error) {
        console.error("Error processing the request:", error);
        res.status(500).send("Something went wrong");
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});