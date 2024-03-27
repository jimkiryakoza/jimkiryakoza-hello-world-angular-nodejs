/**
 * Asynchronously extracts text from a PDF document using PDF.js.
 * This function iterates through each page of the PDF, retrieves the text content,
 * and logs or collects the text along with its positioning information (x, y coordinates, width).
 *
 * @param {Object} pdf - The PDF document object obtained from PDF.js.
 * @param {boolean} [log=false] - An optional flag to enable logging of the extracted text.
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of objects containing the extracted text and its positioning information.
 */
async function extractTextFromPDF(pdf, log = false) {
    // Retrieve the total number of pages in the PDF
    const numPages = pdf.numPages;
    console.log(`The PDF has ${numPages} page(s).`);

    // Initialize an array to store the extracted text and its positioning information
    let extractedText = [];

    // Iterate through each page of the PDF
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        // Retrieve the page object
        const page = await pdf.getPage(pageNum);
        // Extract the text content from the page
        const textContent = await page.getTextContent();

        // Iterate through each text item in the page
        textContent.items.forEach((line) => {
            // Extract the positioning information and text from the text item
            const y = line.transform[5];
            const x = line.transform[4];
            const text = line.str;
            const width = line.width;

            // Push the extracted information into the extractedText array
            extractedText.push({
                page: pageNum,
                x,
                y,
                width,
                text,
            });

            // Log the extracted information if the log flag is true
            if (log)
                console.log(
                    pageNum,
                    y.toFixed(2),
                    x.toFixed(2),
                    width.toFixed(2),
                    "\t[" + text + "]",
                );
        });
    }

    // Return the array of extracted text and its positioning information
    return extractedText;
}

async function extractPDFDocFromUrl(pdfUrl) {
    console.log(`Getting PDF from ${pdfUrl}`);

    // Dynamically imports node-fetch to fetch the PDF
    const fetch = (await import("node-fetch")).default;

    // Dynamically imports pdfjs-dist to handle PDF operations
    const pdfjsLib = await import("pdfjs-dist");

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
 * Combines text entries from a PDF document based on a specified starting page.
 * This function iterates through each text entry, combining entries that are on the same page and have the same y-coordinate.
 * It also allows for logging of the combined entries.
 *
 * @param {Array<Object>} textEntries - An array of objects representing text entries from a PDF document, where each object contains properties such as page number, x and y coordinates, width, and text.
 * @param {number} specStartPage - The starting page number from which to begin combining text entries.
 * @param {boolean} [log=false] - An optional flag to enable logging of the combined entries.
 * @returns {Array<Object>} - An array of objects representing the combined text entries, including properties for page number, x and y coordinates, width, and text.
 */
function combineTextEntries(textEntries, specStartPage, log = false) {
    // Initialize an object to store combined entries by their page and y-coordinate
    const combinedEntriesMap = {};

    // Iterate through each text entry
    textEntries.forEach((entry) => {
        // Check if the entry is on or after the specified starting page
        if (entry.page >= specStartPage) {
            // Create a unique key for the entry based on its page and y-coordinate
            const key = `${entry.page}-${entry.y})`;
            // If the entry does not already exist in the map, add it
            if (!combinedEntriesMap[key]) {
                combinedEntriesMap[key] = {
                    page: entry.page,
                    x: entry.x,
                    y: entry.y,
                    width: entry.width,
                    text: entry.text,
                };
            } else {
                // If the entry already exists, append the text and add the width
                combinedEntriesMap[key].text += entry.text;
                combinedEntriesMap[key].width += entry.width;
            }
        }
    });

    // Convert the map of combined entries into an array
    let combinedEntries = Object.values(combinedEntriesMap);
    // Sort the combined entries by page and y-coordinate in descending order of y
    combinedEntries.sort((a, b) => {
        if (a.page !== b.page) {
            return a.page - b.page;
        } else {
            return b.y - a.y; // For descending order of y
        }
    });

    // Log the combined entries if the log flag is true
    if (log)
        combinedEntries.forEach((line) => {
            console.log(
                `Page ${line.page} (${line.y.toFixed(2)},${line.x.toFixed(2)})\t[${line.text
                }]`,
            );
        });

    // Return the array of combined entries
    return combinedEntries;
}

/**
 * Determines the starting y-coordinate for a specific page in a combined PDF text array.
 * This function checks if the second line of text on the page is a number. If it is,
 * it uses the y-coordinate of the second line; otherwise, it uses the y-coordinate of the third line.
 * It then subtracts 2 from the determined y-coordinate to find the starting y-coordinate for the page.
 *
 * @param {Array<Object>} combinedPDFText - An array of objects representing the combined text from a PDF document, where each object contains properties such as page number, x and y coordinates, width, and text.
 * @param {boolean} [log=false] - An optional flag to enable logging of the starting y-coordinate.
 * @returns {number} - The starting y-coordinate for the specified page, adjusted by subtracting 2.
 */
function getSpecPageStartLine(combinedPDFText, log = false) {
    // Initialize the starting y-coordinate
    let startLine = 0.0;
    // Retrieve the text of the second line on the page
    const secondLineText = combinedPDFText[1].text;
    // Check if the second line's text is a number
    startLine = isNaN(Number(secondLineText))
        ? combinedPDFText[1].y // If not a number, use the y-coordinate of the second line
        : combinedPDFText[2].y; // If it is a number, use the y-coordinate of the third line
    // Log the starting y-coordinate
    if (log) console.log(`Starting y: ${startLine}`);
    // Return the starting y-coordinate adjusted by subtracting 2
    return startLine - 2;
}

/**
 * Determines if a given text is a line number based on a predefined set of values.
 * This function checks if the provided text matches any of the specified line numbers.
 *
 * @param {string} text - The text to check if it represents a line number.
 * @returns {boolean} - Returns true if the text matches any of the specified line numbers, otherwise false.
 */
function isLineNumberText(text) {
    let isLineNumber = false;

    // Check if the text matches any of the specified line numbers
    switch (text) {
        case "O":
        case "5":
        case "10":
        case "15":
        case "20":
        case "25":
        case "30":
        case "35":
        case "40":
        case "45":
        case "50":
        case "SO":
        case "55":
        case "60":
        case "65":
            isLineNumber = true;
            break;
    }

    return isLineNumber;
}

/**
 * Splits lines from a combined PDF text array based on line numbers and a specified starting line.
 * This function iterates through each line, checking if the line's y-coordinate is greater than or equal to the specified starting line or if the line's text matches a predefined set of line numbers.
 * It then splits the line into two parts if the match location is greater than 270, adjusting the x and width properties accordingly.
 * The function also allows for logging of the split lines.
 *
 * @param {Array<Object>} combinedPDFLines - An array of objects representing the combined text from a PDF document, where each object contains properties such as page number, x and y coordinates, width, and text.
 * @param {number} specStartLine - The y-coordinate of the starting line.
 * @param {boolean} [log=false] - An optional flag to enable logging of the split lines.
 * @returns {Array<Object>} - An array of objects representing the split lines, including properties for page number, x and y coordinates, width, and text.
 */
function splitLineByLineNumber(combinedPDFLines, specStartLine, log = false) {
    // Regular expression to match line numbers
    const regex = /(?:^|\s)(10|15|20|25|30|35|40|45|50|55|60|65|5)(?=\s|$)/;
    let splitLines = [];

    // Iterate through each line in the combinedPDFLines array
    for (let ii = 0; ii < combinedPDFLines.length; ii++) {
        // Check if the line's y-coordinate is greater than or equal to the specified starting line or if the line's text matches a predefined set of line numbers
        if (
            combinedPDFLines[ii].y >= specStartLine ||
            isLineNumberText(combinedPDFLines[ii].text)
        ) {
            continue; // Skip this line if it meets the condition
        }

        // Extract the current line
        const line = combinedPDFLines[ii];
        // Match the line's text against the regular expression
        const match = line.text.match(regex);

        // If a match is found
        if (match) {
            // Calculate the average character width
            const avgCharWidth = line.width / line.text.length;
            // Split the line's text into left and right parts based on the match location
            const leftText = line.text.substring(0, match.index);
            const rightText = line.text.substring(match.index + match[0].length);
            // Calculate the match location
            const matchLocation = line.x + avgCharWidth * leftText.length;

            // If the match location is greater than 270
            if (matchLocation > 270) {
                // Add the left part of the split line to the splitLines array
                if (leftText.trim().length > 0) {
                    splitLines.push({
                        page: line.page,
                        x: line.x,
                        y: line.y,
                        width: leftText.length * avgCharWidth,
                        text: leftText,
                    });
                }

                // Add the right part of the split line to the splitLines array
                if (rightText.trim().length > 0) {
                    splitLines.push({
                        page: line.page,
                        x: line.x + (leftText.length + match[0].length) * avgCharWidth,
                        y: line.y,
                        width: rightText.length * avgCharWidth,
                        text: rightText,
                    });
                }
            } else {
                // Add the entire line to the splitLines array
                splitLines.push(line);
            }
        } else {
            // Add the entire line to the splitLines array
            splitLines.push(line);
        }
    }

    // Sort the split lines by page and y-coordinate
    splitLines.sort((a, b) => {
        if (a.page !== b.page) {
            return a.page - b.page;
        } else {
            return b.y - a.y;
        }
    });

    // Log the split lines if the log flag is true
    if (log)
        splitLines.forEach((line) => {
            console.log(
                `Page ${line.page} (${line.y.toFixed(2)},${line.x.toFixed(2)})\t[${line.text
                }]`,
            );
        });

    // Return the array of split lines
    return splitLines;
}

/**
 * Assigns line numbers to PDF lines based on their column and y-coordinate differences.
 * This function iterates through each line in the provided array, resetting the line number
 * whenever a new column is encountered. It also increments the line number based on the
 * difference in y-coordinates between consecutive lines, considering a larger difference as
 * indicating a new line.
 *
 * @param {Array<Object>} pdfLines - An array of objects representing lines from a PDF document, where each object contains properties such as page number, x and y coordinates, width, text, and column number.
 * @param {boolean} [log=false] - An optional flag to enable logging of the line numbers.
 */
function setLineNumbers(pdfLines, log = false) {
    let currentCol = pdfLines[0].column;
    let lineNumber = 1;
    for (let ii = 0; ii < pdfLines.length; ii++) {
        // Check if the current line is in a new column
        if (currentCol != pdfLines[ii].column) {
            currentCol = pdfLines[ii].column;
            lineNumber = 1; // Reset line number for the new column
        }
        // Assign the current line number to the line object
        pdfLines[ii].lineNumber = lineNumber;

        // Increment the line number based on the difference in y-coordinates between the current line and the next line
        if (ii + 1 < pdfLines.length) {
            lineNumber += pdfLines[ii].y - pdfLines[ii + 1].y > 14 ? 2 : 1;
        }
    }

    // Log the line numbers if the log flag is true
    if (log)
        pdfLines.forEach((line) => {
            console.log(
                `Page ${line.page} (${line.column}, ${line.lineNumber})\t[${line.text}]`,
            );
        });
}

/**
 * This function splits lines from a PDF document into columns based on a specified
 * maximum column length. It iterates through each line, checking if the line's
 * text length exceeds the maximum column length and if so, splits the text into
 * two parts. The function also handles the transition between pages and columns
 * within the document.
 *
 * @param {Array<Object>} pdfLines - An array of objects representing lines from
 *                                   the PDF document, where each object contains
 *                                   properties such as page number, x and y
 *                                   coordinates, width, and text.
 * @param {number} colLength - The maximum length of a column.
 * @param {boolean} [log=false] - An optional flag to enable logging of the
 *                                split lines.
 * @returns {Array<Object>} - An array of objects representing the split lines,
 *                            including properties for page number, x and y
 *                            coordinates, width, text, and column number.
 */
function splitLinesBySize(pdfLines, colLength, log = false) {
    // Initialize an array to hold the split lines
    let splitLines = [];

    // Track the current page and column number
    let currentPage = pdfLines[0].page;
    let currentCol = 1;

    // Iterate through each line in the PDF
    for (let ii = 0; ii < pdfLines.length; ii++) {
        // Check if the current line is on a new page
        if (currentPage != pdfLines[ii].page) {
            // Update the current page and increment the column number
            currentPage = pdfLines[ii].page;
            currentCol += 2;
        }

        // Extract properties from the current line
        const page = pdfLines[ii].page;
        const x = pdfLines[ii].x;
        const y = pdfLines[ii].y;
        const width = pdfLines[ii].width;
        const text = pdfLines[ii].text;

        // Check if the line's text length exceeds the maximum column length
        if (x < 100 && text.length > colLength) {
            // Split the text into two parts
            const [leftColumnText, rightColumnText] = splitText(text, colLength);
            // Add the left part of the split text to the splitLines array
            splitLines.push({
                page,
                x,
                y,
                width,
                text: leftColumnText,
                column: currentCol,
            });

            // Add the right part of the split text to the splitLines array
            splitLines.push({
                page,
                x: 310,
                y,
                width,
                text: rightColumnText,
                column: currentCol + 1,
            });
        } else {
            // Determine the column number based on the x coordinate
            const column = x < 100 ? currentCol : currentCol + 1;
            // Add the line to the splitLines array
            splitLines.push({ page, x, y, width, text, column: column });
        }
    }

    // Sort the split lines by page, column, and y coordinate
    splitLines.sort((a, b) => {
        if (a.page !== b.page) {
            return a.page - b.page;
        } else if (a.column !== b.column) {
            return a.column - b.column;
        } else {
            return b.y - a.y;
        }
    });

    // Log the split lines if the log flag is true
    if (log)
        splitLines.forEach((line) => {
            console.log(
                `Page ${line.page} (${line.column}, ${line.y.toFixed(
                    2,
                )},${line.x.toFixed(2)})\t[${line.text}]`,
            );
        });

    // Return the array of split lines
    return splitLines;
}

/**
 * This function splits a given text into two parts based on a specified maximum column size.
 * It ensures that the split occurs at a space character to avoid breaking words, unless
 * the text is shorter than the maximum column size, in which case it returns the text
 * as is and an empty string.
 *
 * @param {string} text - The text to be split.
 * @param {number} maxColumnSize - The maximum size of the first part of the split text.
 * @returns {Array<string>} - An array containing two strings: the first part of the text
 *                             and the second part, or the original text and an empty string
 *                             if the text is shorter than maxColumnSize.
 */
function splitText(text, maxColumnSize) {
    // Check if the text is shorter or equal to maxColumnSize
    if (text.length <= maxColumnSize) {
        return [text, ""];
    }

    // Find the last space before maxColumnSize
    let splitIndex = text.substring(0, maxColumnSize).lastIndexOf(" ");
    // If there is no space, split at maxColumnSize
    if (splitIndex === -1) {
        splitIndex = maxColumnSize;
    }

    // Split the text into two parts
    const part1 = text.substring(0, splitIndex);
    const part2 = text.substring(splitIndex + 1);

    return [part1, part2];
}

/**
 * This function identifies the first page in a PDF document that contains
 * specifications based on a given pattern. It scans through the extracted text
 * line by line, looking for lines that match a specific pattern indicating the
 * start of specifications. The function uses a regular expression to match
 * lines that contain numbers indicating the start of specifications.
 *
 * @param {Array<Object>} extractedText - An array of objects representing the
 *                                        extracted text from the PDF document,
 *                                        where each object contains the text,
 *                                        page number, and other properties.
 * @param {boolean} [log=false] - An optional flag to enable logging of
 *                                matched lines and their locations.
 * @returns {number} - The page number where the first specification starts,
 *                     or 0 if no specification start page is found.
 */
function findFirstSpecPage(extractedText, log = false) {
    // Regular expression to match lines containing numbers indicating the start of specifications
    const regex = /(?:^|\s)(10|15|20|25|30|35|40|45|50|55|60|65|5)(?=\s|$)/;

    let specPage = 0; // Initialize the page number of the first specification
    let currentPage = extractedText[0].page; // Initialize the current page number
    let columnEntries = 0; // Initialize the count of column entries

    // Loop through each line in the extracted text
    for (let ii = 0; ii < extractedText.length; ii++) {
        const line = extractedText[ii];

        // Check if the line matches the regular expression
        const match = line.text.match(regex);
        if (match) {
            // Calculate the average character width and the match location
            const avgCharWidth = line.width / line.text.length;
            const matchLocation =
                line.x + avgCharWidth * line.text.slice(0, match.index).length;
            // If the match location is greater than 250, increment the column entries
            if (matchLocation > 250) {
                if (log) console.log(line.page, matchLocation, match[0], line.text);
                columnEntries++;
            }
        }

        // If the current page number changes, check if there are more than 4 column entries
        if (currentPage != line.page) {
            if (columnEntries > 4) {
                specPage = currentPage; // Set the specification start page
                break; // Exit the loop
            }
            currentPage = line.page; // Update the current page number
            columnEntries = 0; // Reset the column entries count
        }
    }

    // Log the specification start page
    if (log) console.log(`Spec start page: ${specPage}`);
    return specPage; // Return the specification start page
}

/**
 * This function asynchronously retrieves and processes a PDF document.
 * It extracts the PDF document from a given URL, extracts text from it,
 * finds the starting page of specifications within the text, and processes
 * the text to return final lines of text with line numbers.
 *
 * @param {string} pdfURL - The URL of the PDF document to process.
 * @returns {Promise<Array<string>>} - A promise that resolves to an array of lines of text with line numbers.
 */
async function getPDF(pdfURL) {
    // Extract the PDF document from the provided URL
    const pdfDocument = await extractPDFDocFromUrl(pdfURL);

    // Extract text from the PDF document
    const pdfText = await extractTextFromPDF(pdfDocument, false);

    // Find the starting page of specifications within the extracted text
    const specStartPage = findFirstSpecPage(pdfText, false);

    // If the starting page of specifications is found
    if (specStartPage > 0) {
        // Combine text entries from the starting page of specifications
        const combinedPDFText = combineTextEntries(pdfText, specStartPage, false);
        // Find the starting line of specifications within the combined text
        const specStartLine = getSpecPageStartLine(combinedPDFText, false);
        // Split the combined text by line number
        const splitPDFLines = splitLineByLineNumber(
            combinedPDFText,
            specStartLine,
            false,
        );

        // Split lines by size and set line numbers
        let finalLines = splitLinesBySize(splitPDFLines, 64, false);
        setLineNumbers(finalLines, false);
        formatLines(finalLines, false);

        // Return the final lines of text with line numbers
        return finalLines;
    }
}

function formatLines(pdfLines, log = false) {
    pdfLines.forEach(line => {
        line.text = line.text.replaceAll(" , ", ", ").replaceAll(" 's", "'s").replaceAll(" .", ".");
    })
}
module.exports = { getPDF, };