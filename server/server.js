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

            // Extract text and coordinates
            content.items.forEach(item => {
                const transform = item.transform;

                // Simplified coordinates example (adjust as needed)
                const x = parseFloat(transform[4]).toFixed(2); // Format X to two decimals
                const y = parseFloat(transform[5]).toFixed(2); // Format Y to two decimals
    
                // Append coordinates to the text
                extractedText += `${i},${y},${x},"${item.str}" \n`;
            });
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
