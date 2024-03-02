const express = require('express');
const app = express();
const port = 3000; // Example port
const cors = require('cors');
const pdfSearch = require('./pdfSearch');

// Setup CORS options
const corsOptions = {
    origin: true
};
app.use(cors(corsOptions));

// Use Express's built-in JSON parser middleware
app.use(express.json());

// Handles POST requests to '/extract-pdf-text' route
app.post('/extract-pdf-text', async (req, res) => {
    // Extracts the PDF URL from the request body
    const pdfUrl = req.body.url;
    const searchString = req.body.searchString;

    try {
        const [searchablePDF, combinedPDFLines] = (await pdfSearch.createSearchablePDF(pdfUrl));
        let numberedPDFText = '';
        combinedPDFLines.forEach(pdfLine => {
            numberedPDFText += `Page: ${pdfLine.page} Y: ${pdfLine.y} X: ${pdfLine.x} Column: ${pdfLine.column}, Line: ${pdfLine.line}, Text: ${pdfLine.text} \n`;
        });

        // Logs the incoming request to the console
        console.log("Incoming call to extract-pdf-text");
        console.log("PDF Url: " + pdfUrl);
        console.log("Search string: " + searchString);

        let results = pdfSearch.searchPDF(searchablePDF, searchString);
        let allSearchResults = '';
        results.forEach(result => {
            result.forEach(location => {
                allSearchResults += `Column: ${location.column} Line: ${location.line} Text: ${location.text} \n`;
            });
            allSearchResults += '*********************************************************************************\n';
        })

        res.json({ text: numberedPDFText, searchResults: allSearchResults });

    } catch (error) {
        // Logs the error and returns a 500 Internal Server Error response
        console.error('Error extracting text:', error);
        res.status(500).send('Error extracting text from PDF');
    }
});

app.listen(port, () => {
    console.log(`PDF text extraction API listening on port ${port}`);
});
