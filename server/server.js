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


/**
 * Assigns line numbers to combinedLines based on their y-coordinate and column value.
 * This function iterates through combinedLines, incrementing the line number for each line
 * that has a column value not equal to 0 and whose y-coordinate is less than 712.00.
 * It also resets the line number to 0 for lines where the column value is 0.
 *
 * @param {Array} combinedLines - An array of objects, each representing a line with properties for page, x, y, column, and text.
 */
function setLineNumbers(combinedLines) {
    let lineNumber = 0;
    for (let index = 1; index < combinedLines.length; index++) {
        if (combinedLines[index].column !== 0) {
            if (combinedLines[index].y < 712.00) {
                let lineIncrement = Math.trunc(combinedLines[index - 1].y) - Math.trunc(combinedLines[index].y) > 12 ? 2 : 1;
                combinedLines[index].line = lineNumber + lineIncrement;
                lineNumber += lineIncrement;
            }
        } else {
            lineNumber = 0;
        }
    }
}

/**
 * Assigns column numbers to lines based on their position within a document.
 *
 * This function iterates over the combinedLines array, starting from the line after the description separator.
 * It assigns column numbers to each line based on their page number and y-coordinate, incrementing the
 * column number for each new page or when the y-coordinate increases significantly (more than 12 units).
 * This is particularly useful for documents where columns are distinct on different pages or when the y-coordinate
 * indicates a new column.
 *
 * @param {Array} combinedLines - An array of objects, each representing a line with properties for page, x, y, and text.
 * @param {string} descriptionSeparator - A string used to identify the start of the main content in the document.
 */
function setColumns(combinedLines, descriptionSeparator) {
    // Find the start of the description
    let descriptionStart = combinedLines.findIndex(line => line.text === descriptionSeparator);

    let pageColumn = 1;
    let documentColumn = 1;

    for (let i = descriptionStart + 1; i < combinedLines.length; i++) {
        if (combinedLines[i].page === combinedLines[i - 1].page) {
            const currentY = parseFloat(combinedLines[i].y);
            const previousY = parseFloat(combinedLines[i - 1].y);

            if (currentY > previousY) {
                pageColumn++;
                if (pageColumn === 1 || pageColumn === 3) {
                    documentColumn++;
                }
            }

            if (pageColumn === 1 || pageColumn === 3) {
                combinedLines[i].column = documentColumn;
            }
        } else {
            pageColumn = 1;
            documentColumn++;
        }
    }
}

/**
 * Combines text lines based on their page and y-coordinate to form a single line for each unique key.
 *
 * This function iterates over the extracted text items, combining their text based on the combination
 * of their page number and y-coordinate. It uses a Map to efficiently group lines by their unique key,
 * which is a combination of page and y-coordinate. The function then transforms this Map into an array
 * of combined lines, each represented as an object with properties for page, x, y, and text.
 *
 * @param {Array} extractedTextItems - An array of objects, each containing properties for page, x, y, and text.
 * @returns {Array} An array of combined lines, where each line is represented as an object with properties for page, x, y, and text.
 */
function combineLines(extractedTextItems) {
    let combinedLines = [];
    let combinedLine = extractedTextItems[0].text;

    for (let index = 1; index < extractedTextItems.length; index++) {
        if (extractedTextItems[index - 1].page === extractedTextItems[index].page &&
            extractedTextItems[index - 1].y === extractedTextItems[index].y) {
            combinedLine += extractedTextItems[index].text;
        } else {
            combinedLines.push({
                page: extractedTextItems[index - 1].page,
                y: extractedTextItems[index - 1].y,
                x: extractedTextItems[index - 1].x,
                text: combinedLine,
                line: 0,
                column: 0
            });
            combinedLine = extractedTextItems[index].text;
        }
    }

    // Handle the last item
    combinedLines.push({
        page: extractedTextItems[extractedTextItems.length - 1].page,
        y: extractedTextItems[extractedTextItems.length - 1].y,
        x: extractedTextItems[extractedTextItems.length - 1].x,
        text: combinedLine,
        line: 0,
        column: 0
    });

    return combinedLines;
}
app.listen(port, () => {
    console.log(`PDF text extraction API listening on port ${port}`);
});
