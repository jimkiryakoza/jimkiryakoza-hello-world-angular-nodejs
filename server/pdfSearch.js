/**
 * Searches through a list of searchable PDFs for a given search string.
 * It tokenizes the search string and compares each token against the text of each PDF.
 * If all tokens are found within a single PDF, the PDF is considered a match and added to the search results.
 *
 * @param {Array} searchablePDF - An array of PDF objects with a 'text' property.
 * @param {string} searchString - The search string to find within the PDFs.
 * @returns {Array} An array of arrays containing the matched PDFs.
 */
function searchPDF(searchablePDF, searchString) {
    let searchStringTokens = searchString.toLowerCase().split(' ');
    let searchResults = [];

    for (var ii = 0; ii < searchablePDF.length; ii++) {
        let foundTokenCounter = 0;
        let foundTokens = [];
        for (var jj = 0; jj < searchStringTokens.length; jj++) {
            if (searchStringTokens[jj] == searchablePDF[ii].text) {
                foundTokenCounter++;
                foundTokens.push(searchablePDF[ii]);
                ii++;
            }
        }

        if (foundTokenCounter == searchStringTokens.length) {
            console.log(foundTokens);
            searchResults.push(foundTokens);
        }
    }

    return searchResults;

}

/**
 * Extracts the document name from a list of text items.
 * @param {Array} extractedTextItems - An array of objects with text items.
 * @returns {string} The document name found after 'Patent No.:'.
 */
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

/**
 * Transforms an array of PDF lines into a searchable format by splitting each line into individual words.
 * Each word is then encapsulated into an object containing its position (column and line) and the word itself in lowercase.
 *
 * @param {Array} combinedPDFLines - An array of objects representing PDF lines, each with a 'text' property.
 * @returns {Array} An array of objects where each object represents a word from the PDF, with properties for column, line, and text.
 */
function createSearchablePDF(combinedPDFLines) {
    let newItems = [];

    combinedPDFLines.forEach(item => {
        // Split the text into words
        const words = item.text.split(' ');

        // For each word, create a new item object and push it to the newItems array
        words.forEach(word => {
            newItems.push({
                column: item.column,
                line: item.line,
                text: word.toLowerCase(),
            });
        });
    });

    return newItems;
}

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
 * @param {string} documentName - A string used to identify the start of the main content in the document.
 */
function setColumnNumbers(combinedLines, documentName) {

    let descriptionStart = -1;
    for (var ii = 0; ii < combinedLines.length; ii++) {
        if (combinedLines[ii].text.replaceAll(' ', '') == documentName) {
            descriptionStart = ii;
            break;
        }
    }

    console.log('descriptionStart: ' + descriptionStart);

    let pageColumn = 1;
    let documentColumn = 1;

    for (let i = descriptionStart + 1; i < combinedLines.length; i++) {
        // Check if i - 1 is a valid index before accessing combinedLines[i - 1]
        if (i - 1 >= 0) {
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
    extractDocumentNumber,
    createSearchablePDF,
    setLineNumbers,
    setColumnNumbers,
    combinePDFLines,
    searchPDF
};
