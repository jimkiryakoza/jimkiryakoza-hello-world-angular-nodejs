async function extractTextFromPDF(pdfPath, log = false) {
    const pdfjsLib = await import('pdfjs-dist');
    let pdfText = [];
    try {
        const pdfDocument = await pdfjsLib.getDocument(pdfPath).promise;
        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();

            textContent.items.forEach((item) => {
                const [, , , , posX, posY] = item.transform;
                const textWidth = item.width;
                pdfText.push({
                    page: pageNum,
                    text: item.str,
                    x: posX,
                    y: posY,
                    width: textWidth,
                    col: posX < 290 ? 1 : 2,
                });
            });
        }
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
    }

    if (log)
        pdfText.forEach((text) => {
            console.log(
                `Page: ${text.page} at (y:${text.y.toFixed(2)},x:${text.x.toFixed(
                    2,
                )},w:${text.width.toFixed(2)})\t[${text.text}]`,
            );
        });

    return pdfText;
}

function combinePDFText(pdfText, log = false) {
    let pdfTextLines = {};

    pdfText.forEach((line) => {
        const key = `${line.page}-${line.col}-${line.y}`;
        if (line.text.indexOf('reconnaissance') > 0) console.log(key, line.text);
        if (pdfTextLines[key]) {
            pdfTextLines[key].text += line.text;
            pdfTextLines[key].width += line.width;
        } else {
            pdfTextLines[key] = {
                page: line.page,
                text: line.text,
                x: line.x,
                y: line.y,
                width: line.width,
                col: line.col,
            };
        }
    });

    let pdfCombinedText = Object.values(pdfTextLines);

    pdfCombinedText.sort((a, b) => {
        if (a.page !== b.page) {
            return a.page - b.page;
        } else if (a.col !== b.col) {
            return a.col - b.col;
        } else {
            return b.y - a.y;
        }
    });

    if (log)
        pdfCombinedText.forEach((text) => {
            console.log(
                `Page: ${text.page} Col: ${text.col} at (${text.y.toFixed(
                    2,
                )}, ${text.x.toFixed(2)} ${text.width.toFixed(2)})\t[${text.text}]`,
            );
        });

    return pdfCombinedText;
}

function splitPDFLines(combinedPDFText, log = false) {
    let splitLines = [];
    const regex = /(?:^|\s)(5|10|15|20|25|30|35|40|45|50|55|60|65)(?=\s|$)/;

    let currentPage = combinedPDFText[0].page;
    let pageCol = 1;
    combinedPDFText.forEach((line) => {
        if (currentPage != line.page) {
            currentPage = line.page;
            pageCol += 2;
        }
        const avgCharWidth = line.width / line.text.length;
        const match = line.text.match(regex);
        const foundPos = match ? line.x + avgCharWidth * match.index : -1;
        if (match && foundPos > 263) {
            const textBeforeMatch = line.text.substring(0, match.index);
            const textAfterMatch = line.text.substring(match.index + match[0].length);

            if (textBeforeMatch.trim().length > 0) {
                splitLines.push({
                    page: line.page,
                    text: textBeforeMatch,
                    y: line.y,
                    x: line.x,
                    width: avgCharWidth * textBeforeMatch.length,
                    col: pageCol,
                });
            }
            if (textAfterMatch.trim().length > 0) {
                splitLines.push({
                    page: line.page,
                    text: textAfterMatch,
                    y: line.y,
                    x: foundPos + avgCharWidth * (match[2] ? match[2].length : 0),
                    width: avgCharWidth * textAfterMatch.length,
                    col: pageCol + 1,
                });
            }
            // Log after adding the lines to splitLines
            if (log) {
                console.log(`[${line.text}]`);
                console.log(`Col: ${pageCol} Before: ${line.x.toFixed(2)} \t[${textBeforeMatch}]`);
                const newX = foundPos + avgCharWidth * (match[2] ? match[2].length : 0);
                console.log(`Col: ${pageCol + 1} After: ${newX.toFixed(2)}\t[${textAfterMatch}]`);
                console.log('--------------------------------');
            }
        } else {
            splitLines.push(line);
        }
    });

    splitLines.sort((a, b) => {
        if (a.page !== b.page) {
            return a.page - b.page;
        } else if (a.col !== b.col) {
            return a.col - b.col;
        } else {
            return b.y - a.y;
        }
    });

    // Optionally log the final sorted splitLines
    if (log) {
        splitLines.forEach((text) => {
            console.log(
                `Page: ${text.page} Col: ${text.col} at (${text.y.toFixed(
                    2,
                )}, ${text.x.toFixed(2)} ${text.width.toFixed(2)})\t[${text.text}]`,
            );
        });
    }

    return splitLines;
}

function formatLines(pdfLines, log = false) {
    // Initialize variables to track the current column and line number
    let currentCol = null;
    let lineNumber = 1;

    for (let i = 0; i < pdfLines.length; i++) {
        const line = pdfLines[i];
        // Clean up the text format
        line.text = line.text
            .trim()
            .replaceAll(' ,', ',')
            .replaceAll(' /', '/')
            .replaceAll(" ' ", "'")
            .replaceAll(' -', '-')
            .replaceAll(' . ', '.');
        // Check if we've moved to a new column
        if (line.col !== currentCol) {
            // Reset the line number for a new column
            lineNumber = 1;
            currentCol = line.col;
        }

        // Assign the current line number to the line
        line.lineNumber = lineNumber;

        // Only compare y values if there's a next entry in the list
        if (i < pdfLines.length - 1) {
            const nextLine = pdfLines[i + 1];
            // Increase the line number based on the difference in y values
            if (Math.abs(line.y - nextLine.y) < 12) {
                lineNumber += 1;
            } else {
                lineNumber += 2;
            }
        }

        // Log the line details if logging is enabled
        if (log) {
            console.log(
                `Page: ${line.page} Col: ${line.col} Line: ${line.lineNumber
                } at (${line.y.toFixed(2)}, ${line.x.toFixed(2)} ${line.width.toFixed(2)})\t[${line.text}]`,
            );
        }
    }
}

async function main() {
    //const pdfPath = __dirname + "/US11223601.pdf";
    //const pdfPath = __dirname + "/temp.pdf";
    const pdfPath = __dirname + '/tempold.pdf';
    let pdfText = await extractTextFromPDF(pdfPath, false);
    let combinedPDFText = combinePDFText(pdfText, false);
    let splitLines = splitPDFLines(combinedPDFText, false);
    let finalLines = combinePDFText(splitLines, false);
    formatLines(finalLines, true);
}

main();
