async function createSearchablePDF(pdfUrl) {
    let combinedPDFLines = (await getPDFTextAndMetadata(pdfUrl));

    let searchAblePDF = [];
    combinedPDFLines.forEach(item => {
        // Split the text into words
        const words = item.text.split(' ');

        // For each word, create a new item object and push it to the searchAblePDF array
        words.forEach(word => {
            searchAblePDF.push({
                column: item.column,
                line: item.line,
                text: word.toLowerCase().trim(),
            });
        });
    });

    return [searchAblePDF, combinedPDFLines];
}

function searchPDF(searchablePDF, searchString) {
    const searchStringTokens = searchString.toLowerCase().split(/\s+/);
    const numSearchTokens = searchStringTokens.length;

    let searchResults = [];
    for (var ii = 0; ii < searchablePDF.length; ii++) {

        if (searchablePDF[ii].column > 0) {
            let foundTokenCounter = 0;
            let foundTokens = [];
            for (var jj = 0; jj < numSearchTokens; jj++) {
                if (levenshteinDistance(searchStringTokens[jj].trim(), searchablePDF[ii].text) < 2) {
                    foundTokenCounter++;
                    foundTokens.push(searchablePDF[ii]);
                    ii++;
                } else {
                    break;
                }
            }
            if (foundTokenCounter == numSearchTokens) {
                searchResults.push(foundTokens);
            }
        }
    }
    return searchResults;
}


function levenshteinDistance(a, b) {
    const matrix = [];

    // Ensure that a is the shorter string.
    if (a.length > b.length) {
        [a, b] = [b, a];
    }

    // Initialize the first row of the matrix.
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Initialize the first column of the matrix.
    for (let i = 1; i <= a.length; i++) {
        matrix[0][i] = i;
    }

    // Populate the matrix.
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1], // substitution
                    matrix[i][j - 1],     // insertion
                    matrix[i - 1][j]      // deletion
                ) + 1;
            }
        }
    }

    return matrix[b.length][a.length];
}

async function extractPDFTextFromUrl(pdfUrl) {
    // Dynamically imports node-fetch to fetch the PDF
    const fetch = (await import('node-fetch')).default;

    // Dynamically imports pdfjs-dist to handle PDF operations
    const pdfjsLib = await import('pdfjs-dist');

    // Fetches the PDF data from the provided URL
    const response = await fetch(pdfUrl);
    const pdfData = await response.arrayBuffer();

    // Loads the PDF document using pdfjs-dist
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdfDocument = await loadingTask.promise;

    // Return the pdfDocument or any other relevant data
    return pdfDocument;
}

async function getPDFTextAndMetadata(pdfUrl) {
    let pdfDocument = (await extractPDFTextFromUrl(pdfUrl));

    const numPages = pdfDocument.numPages;
    let pdfTextWithMetadata = []; // Array to store extracted text items

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
            pdfTextWithMetadata.push({
                page: i,
                x: x,
                y: y,
                text: item.str,
                line: 0,
                column: 0
            });
        });
    }

    const documentName = extractDocumentNumber(pdfTextWithMetadata);
    console.log('documentName' + " : " + documentName);

    // Some lines are split into multiple entries, combine them
    let combinedPDFLines = combinePDFLines(pdfTextWithMetadata);

    // Add column and line numbers to the combined lines
    setColumnNumbers(combinedPDFLines, documentName);
    setLineNumbers(combinedPDFLines);

    return combinedPDFLines;
}

function extractDocumentNumber(extractedTextItems) {
    let document = '';
    for (let ii = 0; ii < extractedTextItems.length; ii++) {
        if (extractedTextItems[ii].text.includes('Patent No.:')) {
            document = extractedTextItems[ii + 2].text.replaceAll(' ', '');
            break;
        }
    }
    return document;
}


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

function setColumnNumbers(combinedLines, documentName) {

    const regex = /Sheet\s+1\s+of\s+(\d+)/;
    let columnsStartPage = -1;
    for (var ii = 0; ii < combinedLines.length; ii++) {
        const match = combinedLines[ii].text.match(regex);
        if (match) {
            columnsStartPage = combinedLines[ii].page + parseInt(match[1], 10);
            break;
        }
    }
    let columnsStart = 0;
    for (let ii = 0; ii < combinedLines.length; ii++) {
        if (combinedLines[ii].page == columnsStartPage) {
            columnsStart = ii + 2;
            break;
        }
    }
    let pageColumn = 1;  // columns within a page
    let documentColumn = 1; //columns within a document
    for (let ii = columnsStart; ii < combinedLines.length; ii++) {

        if (combinedLines[ii].page != combinedLines[ii - 1].page) {
            documentColumn++;
            pageColumn = 1;
        } else if (parseFloat(combinedLines[ii].y) > parseFloat(combinedLines[ii - 1].y)) {
            if (pageColumn == 1) {
                documentColumn++;
            }
            pageColumn++;
        }

        if ((pageColumn == 1) || (pageColumn == 3)) {
            combinedLines[ii].column = documentColumn;
        }
    }
}

function combinePDFLines(extractedTextItems) {
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

module.exports = {
    createSearchablePDF,
    searchPDF
};