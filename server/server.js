const express = require('express');
const app = express();
const port = 3000; // Example port
const cors = require('cors');
const { combineLines, setColumns, setLineNumbers } = require('./pdfSearch');

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

    // Logs the incoming request to the console
    console.log("Incoming call to extract-pdf-text from: " + pdfUrl);

    // Checks if the PDF URL is provided, returns 400 Bad Request if not
    if (!pdfUrl) {
        return res.status(400).send('Please provide a valid PDF URL');
    }

    try {
        // Dynamically imports node-fetch to fetch the PDF
        const fetch = (await import('node-fetch')).default;

        // Dynamically imports pdfjs-dist to handle PDF operations
        const pdfjsLib = await import('pdfjs-dist');

        // Fetches the PDF data from the provided URL
        const response = await fetch(pdfUrl);
        const pdfData = await response.arrayBuffer();

        // Loads the PDF document using pdfjs-dist
        const loadingTask = pdfjsLib.getDocument(pdfData);
        const pdfDocument = await loadingTask.promise;

        // Initializes variables for processing the PDF
        const numPages = pdfDocument.numPages;
        let extractedText = '';
        let extractedTextItems = []; // Array to store extracted text items

        // Iterates over each page of the PDF to extract text
        for (let i = 1; i <= numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const content = await page.getTextContent();

            // Processes each text item on the page
            content.items.forEach(item => {
                const transform = item.transform;

                // Extracts and formats the x and y coordinates
                const x = parseFloat(transform[4]).toFixed(2);
                const y = parseFloat(transform[5]).toFixed(2);

                // Creates an object for each text item with its properties
                extractedTextItems.push({
                    page: i,
                    y: y,
                    text: item.str,
                    line: 0,
                    column: 0
                });
            });
        }

        // Combines lines based on their page and y-coordinate
        let combinedLines = combineLines(extractedTextItems);
        // Assigns column numbers to the combined lines
        setColumns(combinedLines, 'US 9, 195,518 B1');
        // Assigns line numbers to the combined lines
        setLineNumbers(combinedLines);

        // Constructs the final extracted text string
        extractedText = '';
        combinedLines.forEach(pdfLine => {
            extractedText += `Page: ${pdfLine.page} Y: ${pdfLine.y} Column: ${pdfLine.column}, Line: ${pdfLine.line}, Text: "${pdfLine.text}" \n`;
        });

        // Returns the extracted text as JSON
        res.json({ text: extractedText });

    } catch (error) {
        // Logs the error and returns a 500 Internal Server Error response
        console.error('Error extracting text:', error);
        res.status(500).send('Error extracting text from PDF');
    }
});



app.listen(port, () => {
    console.log(`PDF text extraction API listening on port ${port}`);
});
