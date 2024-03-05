async function createSearchablePDF(pdfUrl) {
    let combinedPDFLines = (await getPDFTextAndMetadata(pdfUrl));

    let searchAblePDF = [];
    combinedPDFLines.forEach(item => {
        // Split the text into words
        const words = item.text.split(' ');

        // For each word, create a new item object and push it to the searchAblePDF array
        words.forEach(word => {
            if (item.column != 0) {
                searchAblePDF.push({
                    column: item.column,
                    line: item.line,
                    text: word.toLowerCase().trim(),
                });
            }
        });
    });

    return [searchAblePDF, combinedPDFLines];
}

function searchPDF(searchablePDF, searchString) {
    const searchStringTokens = searchString.trim().toLowerCase().split(/\s+/);
    const numSearchTokens = searchStringTokens.length;

    let searchResults = [];
    for (let i = 0; i <= searchablePDF.length - searchStringTokens.length; i++) {
        // Assume the sequence matches until proven otherwise
        let sequenceMatches = true;

        // Check if the sequence starting at the current element matches searchStringTokens
        let foundTokens = [];
        for (let j = 0; j < numSearchTokens; j++) {

            if (levenshteinDistance(searchablePDF[i + j].text, searchStringTokens[j]) < 3) {
                foundTokens.push(searchablePDF[i + j]);
                continue;
            }

            if ((searchablePDF[i + j + 1] != undefined) && (searchablePDF[i + j].line != searchablePDF[i + j + 1].line)) {
                let hyphenatedWord = searchablePDF[i + j].text + searchablePDF[i + j + 1].text;
                if (levenshteinDistance(hyphenatedWord, searchStringTokens[j]) < 3) {
                    foundTokens.push(searchablePDF[i + j]);
                    i++;
                    continue;
                }
            }

            sequenceMatches = false;
            break;
        }

        // If the sequence matches, print the matching sequence
        if (sequenceMatches) {
            searchResults.push(foundTokens);
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

        // Check if the page is blank (has no text items)
        if (content.items.length === 0) {
            // If the page is blank, create a special entry for it
            pdfTextWithMetadata.push({
                page: i,
                x: null,
                y: null,
                text: "This page is intentionally left blank.",
                line: 0,
                column: 0
            });
        } else {
            // Processes each text item on the page if it is not blank
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
    }

    // Some lines are split into multiple entries, combine them
    let combinedPDFLines = combinePDFLines(pdfTextWithMetadata);

    // Add column and line numbers to the combined lines
    setColumnNumbers(combinedPDFLines);
    setLineNumbers(combinedPDFLines);

    return combinedPDFLines;
}


function setLineNumbers(combinedLines) {
    let lineNumber = 0;
    for (let index = 1; index < combinedLines.length; index++) {
        if (combinedLines[index].column !== 0) {
            let lineIncrement = 0;

            if (combinedLines[index].y < 712.00) {
                if (combinedLines[index - 1].y - combinedLines[index].y > 12) {
                    lineIncrement = 2;
                } else {
                    lineIncrement = 1;
                }
            }

            combinedLines[index].line = lineNumber += lineIncrement;
        } else {
            lineNumber = 0;
        }
    }
}

function setColumnNumbers(combinedLines, documentName) {

    const regex = /Sheet\s+1\s+of\s+(\d+)/;
    let specStartPage = -1;
    let figuresStartLine = -1;
    for (var ii = 0; ii < combinedLines.length; ii++) {
        const match = combinedLines[ii].text.match(regex);
        if (match) {
            specStartPage = combinedLines[ii].page + parseInt(match[1], 10);
            figuresStartLine = ii;
            break;
        }
    }

    let specStartLine = -1;
    for (var ii = figuresStartLine; ii < combinedLines.length; ii++) {
        if (combinedLines[ii].page == specStartPage) {
            specStartLine = ii;
            break;
        }
    }

    let columnNumber = 1;
    let currentPage = combinedLines[specStartLine].page;
    for (var ii = specStartLine; ii < combinedLines.length; ii++) {

        if (combinedLines[ii].page != currentPage) {
            currentPage = combinedLines[ii].page;
            columnNumber += 2;
            continue;
        }

        if (combinedLines[ii].y > 710) {
            continue;
        }

        if (combinedLines[ii].x < 298) {
            combinedLines[ii].column = columnNumber;
        } else {
            combinedLines[ii].column = columnNumber + 1;
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