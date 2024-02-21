const express = require('express');
const app = express();
const port = 3000; // Example port
const cors = require('cors');

// Setup CORS options
const corsOptions = {
    origin: true
};

app.use(cors(corsOptions));
// Use Express's built-in JSON parser middleware
app.use(express.json());

app.post('/extract-pdf-text', async (req, res) => {

    
    const pdfUrl = req.body.url;

    console.log("Incoming call to extract-pdf-text from: " + pdfUrl);

    if (!pdfUrl) {
        return res.status(400).send('Please provide a valid PDF URL');
    }

    try {
        // Import node-fetch dynamically 
        const fetch = (await import('node-fetch')).default; 

        // Import pdfjs-dist inside the function where it's needed
        const pdfjsLib = await import('pdfjs-dist');

        const response = await fetch(pdfUrl);
        const pdfData = await response.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument(pdfData);
        const pdfDocument = await loadingTask.promise; 

        const numPages = pdfDocument.numPages;
        let extractedText = '';

        for (let i = 1; i <= numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const content = await page.getTextContent();
            extractedText += content.items.map(item => item.str).join(' ');
        }

        res.json({ text: extractedText }); // Return as JSON

    } catch (error) {
        console.error('Error extracting text:', error);
        res.status(500).send('Error extracting text from PDF');
    }
});

app.listen(port, () => {
    console.log(`PDF text extraction API listening on port ${port}`);
});
