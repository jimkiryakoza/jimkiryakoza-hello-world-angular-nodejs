const { getPDF } = require('./pdfParser')
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
  let combinedPDFLines = await getPDF(pdfUrl)

  let searchAblePDF = []
  combinedPDFLines.forEach((item) => {
    // Split the text into words
    const words = item.text.split(' ')

    // For each word, create a new item object and push it to the searchAblePDF array
    words.forEach((word) => {
      if (item.column != 0) {
        searchAblePDF.push({
          column: item.column,
          line: item.lineNumber,
          text: word.toLowerCase().trim(),
        })
      }
    })
  })

  return [searchAblePDF, combinedPDFLines]
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
  const searchStringTokens = searchString.trim().toLowerCase().split(/\s+/)
  let searchResults = []

  for (let i = 0; i <= searchablePDF.length - searchStringTokens.length; i++) {
    let foundTokens = []
    let sequenceMatches = true

    for (let j = 0; j < searchStringTokens.length; j++) {
      const currentToken = searchStringTokens[j]
      const pdfText = searchablePDF[i + j].text.toLowerCase()

      // Direct fuzzy match for the current token
      if (levenshteinDistance(pdfText, currentToken) <= 2) {
        foundTokens.push(searchablePDF[i + j])
        continue
      } else if (
        i + j + 1 < searchablePDF.length &&
        searchablePDF[i + j].line != searchablePDF[i + j + 1].line
      ) {
        // If at the end of the line check a possible word split between two lines
        const possibleHyphenatedWord =
          searchablePDF[i + j].text + searchablePDF[i + j + 1].text
        if (levenshteinDistance(possibleHyphenatedWord, currentToken) <= 2) {
          foundTokens.push(searchablePDF[i + j])
          i++ // skip over the second part of the hyphenated word
          continue
        }
      }

      sequenceMatches = false
      break
    }

    if (sequenceMatches) {
      searchResults.push(foundTokens)
    }
  }

  return searchResults
}

/**
 * Calculates the Levenshtein distance between two strings, which is the minimum number of single-character 
 * edits (insertions, deletions, or substitutions) required to change one string into the other.
 * This function is often used in fuzzy string matching to quantify the difference between two strings.
 *
 * @param {string} a The first string to compare.
 * @param {string} b The second string to compare.
 * @returns {number} The Levenshtein distance between the two strings. A distance of 0 indicates 
 * that the strings are identical.
 *
 * @example
 * const distance = levenshteinDistance('kitten', 'sitting');
 * console.log(distance); // Outputs: 3
 */
function levenshteinDistance(a, b) {
  const matrix = []

  // Ensure that a is the shorter string.
  if (a.length > b.length) {
    ;[a, b] = [b, a]
  }

  // Initialize the first row of the matrix.
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  // Initialize the first column of the matrix.
  for (let i = 1; i <= a.length; i++) {
    matrix[0][i] = i
  }

  // Populate the matrix.
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] =
          Math.min(
            matrix[i - 1][j - 1], // substitution
            matrix[i][j - 1], // insertion
            matrix[i - 1][j] // deletion
          ) + 1
      }
    }
  }

  return matrix[b.length][a.length]
}

module.exports = {
  createSearchablePDF,
  searchPDF,
}
