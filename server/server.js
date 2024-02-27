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
        let extractedTextItems = []; // Initialize an array to store text items

        for (let i = 1; i <= numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const content = await page.getTextContent();

            // Extract text and coordinates
            content.items.forEach(item => {
                const transform = item.transform;

                // Simplified coordinates example (adjust as needed)
                const x = parseFloat(transform[4]).toFixed(2); // Format X to two decimals
                const y = parseFloat(transform[5]).toFixed(2); // Format Y to two decimals

                extractedText += `${i},${y},${x},"${item.str}" \n`;

                // Create an object for each text item and push it to the array
                extractedTextItems.push({
                    page: i,
                    x: x,
                    y: y,
                    text: item.str
                });
            });
        }

        let combinedLines = [];
        combinedLines = combineLines(extractedTextItems);
        extractedText = '';
        combinedLines.forEach(line => {
            extractedText += `${line.page},${line.y},${line.x},"${line.text}" \n`;
        });

        res.json({ text: extractedText }); // Return as JSON

    } catch (error) {
        console.error('Error extracting text:', error);
        res.status(500).send('Error extracting text from PDF');
    }
});

/**
 * Combines text items based on their page and y-coordinate, concatenating text from items with the same key.
 *  
 * This function iterates over `extractedTextItems`, combines text from items with the same `page` and `y` coordinates,
 * and returns an array of combined lines. Each line in the returned array includes `page`, `x`, `y`, and `text` properties.
 *  
 * @param {Array.<{page: number, x: number, y: number, text: string}>} extractedTextItems - An array of objects representing extracted text items. Each object must have `page`, `x`, `y`, and `text` properties.
 * @returns {Array.<{page: number, x: number, y: number, text: string}>} An array of combined lines, where each line includes `page`, `x`, `y`, and `text` properties.
 *  
 * @example
 * const extractedTextItems = [
 *   { page:  1, x:  10, y:  20, text: "Hello" },
 *   { page:  1, x:  10, y:  20, text: " world" },
 *   { page:  2, x:  30, y:  40, text: "How are you?" }
 * ];
 * const combinedLines = combineLines(extractedTextItems);
 * console.log(combinedLines);
 * // Output: [
 * //   { page:  1, x:  10, y:  20, text: "Hello world" },
 * //   { page:  2, x:  30, y:  40, text: "How are you?" }
 * // ]
 */
function combineLines(extractedTextItems) {

    const multiKeyMap = new Map();

    extractedTextItems.forEach(line => {
        const combinedKey = `${line.page}:${line.y}`;
        let combinedText = line.text;
        if (multiKeyMap.has(combinedKey)) {
            combinedText = multiKeyMap.get(combinedKey).text;
            if ((line.page == 5) && (line.y == 642.64)) {
                console.log('Before: ' + combinedText);
            }
            combinedText = combinedText + line.text;
        }

        multiKeyMap.set(combinedKey, {
            page: line.page,
            x: line.x,
            y: line.y,
            text: combinedText
        });
    });

    let combinedLines = [];
    multiKeyMap.forEach(line => {
        combinedLines.push({
            page: line.page,
            x: line.x,
            y: line.y,
            text: line.text
        });
    });

    return combinedLines;
}

app.listen(port, () => {
    console.log(`PDF text extraction API listening on port ${port}`);
});
