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

                // Create an object for each text item and push it to the array
                extractedTextItems.push({
                    page: i,
                    x: x,
                    y: y,
                    text: item.str,
                    line: 0,
                    column: 0
                });
            });
        }

        let combinedLines = [];
        combinedLines = combineLines(extractedTextItems);
        setColumns(combinedLines, 'US 9, 195,518 B1');
        extractedText = '';
        combinedLines.forEach(pdfLine => {
            extractedText += `Page: ${pdfLine.page} Y: ${pdfLine.y}  X: ${pdfLine.x} Line: ${pdfLine.line}, Column: ${pdfLine.column}, Text: "${pdfLine.text}" \n`;
        });

        res.json({ text: extractedText }); // Return as JSON

    } catch (error) {
        console.error('Error extracting text:', error);
        res.status(500).send('Error extracting text from PDF');
    }
});

function setColumns(combinedLines, descriptionSeparator) {
    // Skip to the description    
    let descriptionStart = 0;
    for (var ii = 0; ii < combinedLines.length; ii++) {
        if (combinedLines[ii].text == descriptionSeparator) {
            descriptionStart = ii;
            break;
        }
    }

    let pageCol = 1;
    let docCol = 1;
    for (var ii = descriptionStart + 1; ii < combinedLines.length; ii++) {
        if (combinedLines[ii].page == combinedLines[ii - 1].page) {
            if (parseFloat(combinedLines[ii].y) > parseFloat(combinedLines[ii - 1].y)) {
                pageCol++;
                if ((pageCol == 1) || (pageCol == 3)) {
                    docCol++;
                }
            }
            if ((pageCol == 1) || (pageCol == 3)) {
                combinedLines[ii].column = docCol;
            }
        } else {
            pageCol = 1;
            docCol++;
        }
    }
}

function combineLines(extractedTextItems) {

    let combinedLines = [];
    let combinedLine = extractedTextItems[0].text;
    let ii = 1;

    for (ii = 1; ii < extractedTextItems.length; ii++) {
        if ((extractedTextItems[ii - 1].page == extractedTextItems[ii].page)
            && (extractedTextItems[ii - 1].y == extractedTextItems[ii].y)) {
            combinedLine += extractedTextItems[ii].text;

        } else {
            combinedLines.push({
                page: extractedTextItems[ii - 1].page,
                y: extractedTextItems[ii - 1].y,
                x: extractedTextItems[ii - 1].x,
                text: combinedLine,
                line: 0,
                column: 0
            });
            combinedLine = extractedTextItems[ii].text;
        }
    }

    combinedLines.push({
        page: extractedTextItems[ii - 1].page,
        y: extractedTextItems[ii - 1].y,
        x: extractedTextItems[ii - 1].x,
        text: combinedLine,
        line: 0,
        column: 0
    });

    return combinedLines;
}

app.listen(port, () => {
    console.log(`PDF text extraction API listening on port ${port}`);
});
