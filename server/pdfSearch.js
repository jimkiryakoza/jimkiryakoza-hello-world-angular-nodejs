/**
 * Asynchronously creates a searchable PDF by extracting text and metadata from a given PDF URL.
 * This function splits the text into individual words and creates a searchable PDF array where each word is an item with its column, line, and text.
 * It filters out words from the first column (column 0) to avoid including headers or footers.
 *
 * @param {string} pdfUrl The URL of the PDF document to be processed.
 * @returns {Promise<Array>} A promise that resolves to an array containing two elements:
 *                           1. An array of objects representing the searchable PDF, where each object has properties for column, line, and text.
 *                           2. The original combined PDF lines including metadata.
 *
 * @example
 * createSearchablePDF('https://example.com/sample.pdf').then(([searchablePDF, combinedPDFLines]) => {
 *   console.log(searchablePDF); // Processed searchable PDF
 *   console.log(combinedPDFLines); // Original PDF text and metadata
 * });
 */
async function createSearchablePDF(pdfUrl) {
    let combinedPDFLines = await getPDFTextAndMetadata(pdfUrl);

    let searchAblePDF = [];
    combinedPDFLines.forEach((item) => {
        // Split the text into words
        const words = item.text.split(' ');

        // For each word, create a new item object and push it to the searchAblePDF array
        words.forEach((word) => {
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

/**
 * Searches through a searchable PDF (an array of words with their positions) for a given search string.
 * This function implements a fuzzy search mechanism, allowing for approximate matches within a specified Levenshtein distance.
 * It identifies sequences of words in the PDF that closely match the search string tokens, considering potential hyphenated words.
 *
 * @param {Array} searchablePDF An array of objects, where each object represents a word from the PDF with its position (column, line, text).
 * @param {string} searchString The string to search for within the PDF. This string is tokenized and searched for in the PDF.
 * @returns {Array} An array of arrays, where each inner array contains objects representing the found tokens that match the search string.
 *                 If no matches are found, an empty array is returned.
 *
 * @example
 * const searchablePDF = [
 *   { column: 1, line: 1, text: 'example' },
 *   { column: 1, line: 1, text: 'searchable' },
 *   { column: 1, line: 2, text: 'pdf' }
 * ];
 * const searchString = 'searchable pdf';
 * const results = searchPDF(searchablePDF, searchString);
 * console.log(results); // Outputs the found sequences that match the search string
 */
function searchPDF(searchablePDF, searchString) {
    const searchStringTokens = searchString.trim().toLowerCase().split(/\s+/);
    let searchResults = [];

    for (let i = 0; i <= searchablePDF.length - searchStringTokens.length; i++) {
        let foundTokens = [];
        let sequenceMatches = true;

        for (let j = 0; j < searchStringTokens.length; j++) {
            const currentToken = searchStringTokens[j];
            const pdfText = searchablePDF[i + j].text.toLowerCase();

            // Direct fuzzy match for the current token
            if (levenshteinDistance(pdfText, currentToken) <= 2) {
                foundTokens.push(searchablePDF[i + j]);
                continue;
            } else if (i + j + 1 < searchablePDF.length && searchablePDF[i + j].line != searchablePDF[i + j + 1].line) {
                // If at the end of the line check a possible word split between two lines
                const possibleHyphenatedWord = searchablePDF[i + j].text + searchablePDF[i + j + 1].text;
                if (levenshteinDistance(possibleHyphenatedWord, currentToken) <= 2) {
                    foundTokens.push(searchablePDF[i + j]);
                    i++; // skip over the second part of the hyphenated word
                    continue;
                }
            }

            sequenceMatches = false;
            break;
        }

        if (sequenceMatches) {
            searchResults.push(foundTokens);
        }
    }

    return searchResults;
}

/**
 * Calculates the Levenshtein distance between two strings, which is the minimum number of single-character edits (insertions, deletions, or substitutions) required to change one string into the other.
 * This function is often used in fuzzy string matching to quantify the difference between two strings.
 *
 * @param {string} a The first string to compare.
 * @param {string} b The second string to compare.
 * @returns {number} The Levenshtein distance between the two strings. A distance of 0 indicates that the strings are identical.
 *
 * @example
 * const distance = levenshteinDistance('kitten', 'sitting');
 * console.log(distance); // Outputs: 3
 */
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
                matrix[i][j] =
                    Math.min(
                        matrix[i - 1][j - 1], // substitution
                        matrix[i][j - 1], // insertion
                        matrix[i - 1][j], // deletion
                    ) + 1;
            }
        }
    }

    return matrix[b.length][a.length];
}

/*
This JavaScript function dynamically imports the 'node-fetch' and 'pdfjs-dist' libraries to fetch a PDF from a given URL and load it using the PDF.js library. It then returns the loaded PDF document.
 
1. It dynamically imports 'node-fetch' to fetch the PDF data from the provided URL.
2. It dynamically imports 'pdfjs-dist' to handle operations on the fetched PDF.
3. It fetches the PDF data as an ArrayBuffer using 'node-fetch'.
4. It loads the PDF document using the fetched data with 'pdfjs-dist', creating a loading task.
5. It waits for the loading task to complete and then returns the loaded PDF document.
 
This function is designed to be used in an asynchronous context, as it relies on awaiting the import of libraries and the completion of the PDF loading task.
*/
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

/**
 * Asynchronously extracts text from a PDF document located at a given URL.
 * This function uses dynamic imports to load `node-fetch` for fetching the PDF data and `pdfjs-dist` for processing the PDF document.
 * It fetches the PDF data, loads the document using `pdfjs-dist`, and returns the loaded PDF document.
 *
 * @param {string} pdfUrl The URL of the PDF document to be extracted.
 * @returns {Promise<PDFDocument>} A promise that resolves to the loaded PDF document object, which can be used for further operations such as text extraction.
 *
 * @example
 * extractPDFTextFromUrl('https://example.com/document.pdf').then(pdfDocument => {
 *   // pdfDocument can be used to extract text or perform other operations
 * });
 */
async function getPDFTextAndMetadata(pdfUrl) {
    let pdfDocument = await extractPDFTextFromUrl(pdfUrl);

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
                text: 'This page is intentionally left blank.',
                line: 0,
                column: 0,
            });
        } else {
            // Processes each text item on the page if it is not blank
            content.items.forEach((item) => {
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
                    column: 0,
                });
            });
        }
    }

    // Some lines are split into multiple entries, combine them
    let combinedPDFLines = combinePDFLines(pdfTextWithMetadata);

    let documentName = extractDocumentName(pdfUrl);

    // Add column and line numbers to the combined lines
    setColumnNumbers(combinedPDFLines, documentName);
    setLineNumbers(combinedPDFLines);

    return combinedPDFLines;
}

/*
This JavaScript function extracts the document name from a given URL, specifically formatted for PDF documents. It performs several operations:
 
1. Splits the URL by '/' to isolate the file name, which is assumed to be the last part of the URL.
2. Removes the '.pdf' extension from the file name, leaving only the document name.
3. Checks if the document name starts with 'US' and removes this prefix if present.
4. Converts the numeric part of the document name to a string.
5. Inserts commas every three digits from the right to format the number according to US numbering conventions.
6. Finally, it prepends 'US' back to the beginning of the formatted number to reconstruct the document name in the desired format.
 
This function is useful for processing URLs that point to PDF documents, particularly those with document names that follow a specific naming convention (e.g., 'US8402276.pdf'). It formats the document name to be more readable, adding spaces and commas for thousands separators.
*/
function extractDocumentName(url) {
    // Split the URL by '/' and get the last part which is the file name
    const parts = url.split('/');

    // Use pop() to get the last part of the array, which should be the file name
    let fileName = parts.pop();

    // Remove the pdf file extension
    fileName = fileName.replace('.pdf', '');

    // Remove the 'US' prefix if it exists
    const numberPart = fileName.replace('US', '');

    // Convert the number part to a string
    let formattedNumber = numberPart.toString();

    // Insert commas every three digits from the right
    formattedNumber = formattedNumber.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Add 'US ' back to the beginning
    return 'US' + formattedNumber;
}

/**
 * Assigns line numbers to elements in an array of combined lines, which are objects representing text lines with their positions in a PDF document.
 * This function iterates through the combined lines, incrementing the line number based on the vertical position of the lines.
 * It resets the line number to 0 for lines in the first column (column 0) and applies a logic to increment the line number by 1 or 2 based on the y-coordinate difference between consecutive lines.
 *
 * @param {Array} combinedLines An array of objects, where each object represents a line with its text, column, and y-coordinate (vertical position).
 * @returns {void} This function modifies the input array in place, adding or updating the `line` property of each object to reflect its line number.
 *
 * @example
 * const combinedLines = [
 *   { column: 0, y: 700.00, text: 'Header' },
 *   { column: 1, y: 680.00, text: 'First line of content' },
 *   { column: 1, y: 660.00, text: 'Second line of content' }
 * ];
 * setLineNumbers(combinedLines);
 * console.log(combinedLines); // The `line` property of each object is updated based on its position
 */
function setLineNumbers(combinedLines) {
    let lineNumber = 0;
    for (let index = 1; index < combinedLines.length; index++) {
        if (combinedLines[index].column !== 0) {
            let lineIncrement = 0;

            if (combinedLines[index].y < 712.0) {
                if (combinedLines[index - 1].column == 0) {
                    lineIncrement = 1;
                } else if (combinedLines[index - 1].y - combinedLines[index].y > 12) {
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

/*
This JavaScript function, `setColumnNumbers`, is designed to assign column numbers to text lines extracted from a document, based on their positions within the document. It operates on an array of `combinedLines`, each representing a line of text with attributes such as `text`, `page`, `y`, and `x` coordinates. The function identifies the start of a specific section within the document (denoted by `documentName`) and then assigns column numbers to the lines following this section.
 
The function performs the following steps:
 
1. Initializes variables to track the start of the section (`specStartLine`, `specStartPage`) and the current column number.
2. Iterates through `combinedLines` to find the line that starts with the specified `documentName` followed by a line containing just the number 1, which represents the start of the first column.
3. Logs the start page and line number of the section.
4. Begins assigning column numbers to lines:
   - If a line is on a new page, increments the column number by 2, indicating a new set of columns.
   - Ignores lines that are not part of the specification (lines with a `y` coordinate greater than 710).
   - Assigns column numbers based on the `x` coordinate of the line: lines with an `x` coordinate less than 298 are assigned to the left column, while lines with an `x` coordinate greater than 311 are assigned to the right column.
 
This function is particularly useful for processing documents that have a structured layout with columns, allowing for the extraction and analysis of text organized by column.
*/
function setColumnNumbers(combinedLines, documentName) {
    // In order to find where the spec we have to look for a line that contains the
    // document number followed by a line that contains just the number 1 which
    // represents column 1
    let specStartLine = -1;
    let specStartPage = -1;
    for (var ii = 0; ii < combinedLines.length; ii++) {
        const lineText = combinedLines[ii].text.replaceAll(' ', '');
        const nextLineText = ii + 1 < combinedLines.length ? combinedLines[ii + 1].text.replaceAll(' ', '') : '';
        if (lineText.startsWith(documentName) && nextLineText == 1) {
            specStartLine = ii;
            specStartPage = combinedLines[ii].page;
            break;
        }
    }

    console.log('specStartPage: ' + specStartPage);
    console.log('specStartLine: ' + specStartLine);

    let columnNumber = 1;
    let currentPage = combinedLines[specStartLine].page;
    for (ii = specStartLine; ii < combinedLines.length; ii++) {
        // when we switch pages, we can bump up the column number
        if (combinedLines[ii].page != currentPage) {
            currentPage = combinedLines[ii].page;
            columnNumber += 2;
            continue;
        }

        // All lines before this y coordinate are not
        // part of the spec so can be ignored
        if (combinedLines[ii].y > 710) {
            continue;
        }

        // The x coordinate is what defines column locations. The gap
        // between the two x values that we test for is the column that
        // contains the embedded line number (10, 15, etc.)
        if (combinedLines[ii].x < 298) {
            // left column
            combinedLines[ii].column = columnNumber;
        } else if (combinedLines[ii].x > 311) {
            // right column
            combinedLines[ii].column = columnNumber + 1;
        }
    }
}

/**
 * Combines consecutive text items extracted from a PDF document into lines, based on their position on the same page and at the same y-coordinate.
 * This function iterates through the extracted text items, grouping them into lines by checking if they are on the same page and have the same y-coordinate.
 * It creates a new line object for each group of text items that meet this criteria, and includes properties for the page, y-coordinate, x-coordinate, text content, line number, and column number.
 *
 * @param {Array} extractedTextItems An array of objects, where each object represents a text item extracted from a PDF with its page, x, y coordinates, and text content.
 * @returns {Array} An array of combined line objects, where each object includes properties for the page, y-coordinate, x-coordinate, text content, line number, and column number.
 *
 * @example
 * const extractedTextItems = [
 *   { page: 1, x: 100, y: 700, text: 'First' },
 *   { page: 1, x: 150, y: 700, text: ' second' },
 *   { page: 1, x: 100, y: 680, text: 'Third' }
 * ];
 * const combinedLines = combinePDFLines(extractedTextItems);
 * console.log(combinedLines); // Outputs combined lines based on their position
 */
function combinePDFLines(extractedTextItems) {
    let combinedLines = [];
    let combinedLine = extractedTextItems[0].text;

    for (let index = 1; index < extractedTextItems.length; index++) {
        if (
            extractedTextItems[index - 1].page === extractedTextItems[index].page &&
            extractedTextItems[index - 1].y === extractedTextItems[index].y
        ) {
            combinedLine += extractedTextItems[index].text;
        } else {
            combinedLines.push({
                page: extractedTextItems[index - 1].page,
                y: extractedTextItems[index - 1].y,
                x: extractedTextItems[index - 1].x,
                text: combinedLine,
                line: 0,
                column: 0,
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
        column: 0,
    });

    return combinedLines;
}

module.exports = {
    createSearchablePDF,
    searchPDF,
};
