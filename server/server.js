const express = require('express')
const app = express()
const port = 3000 // Example port
const cors = require('cors')
const pdfSearch = require('./pdfSearch')

// Setup CORS options
const corsOptions = {
  origin: true,
}
app.use(cors(corsOptions))

// Use Express's built-in JSON parser middleware
app.use(express.json())

// Handles POST requests to '/extract-pdf-text' route
app.post('/search-pdf', async (req, res) => {
  // Extracts the PDF URL from the request body
  const documentNumber = req.body.documentNumber
  const searchString = req.body.searchString

  // Logs the incoming request to the console
  console.log('Incoming call to search-pdf')
  console.log(`Document: ${documentNumber}`)
  console.log(`Search string: ${searchString}`)

  try {
    const [searchablePDF, combinedPDFLines] =
      await pdfSearch.createSearchablePDF(documentNumber.trim())
    let numberedPDFText = ''
    combinedPDFLines.forEach((pdfLine) => {
      numberedPDFText += `Page: ${pdfLine.page} Y: ${pdfLine.y.toFixed(2)} X: ${pdfLine.x.toFixed(2)} Column: ${pdfLine.column}, Line: ${pdfLine.lineNumber}, Text: ${pdfLine.text} \n`
    })


    const searchResults = pdfSearch.searchPDF(searchablePDF, searchString)
    let allSearchResults = '';
    const searchResultCol = searchResults.length > 0 ? searchResults[0][0].column : -1;
    const searchResultLine = searchResults.length > 0 ? searchResults[0][0].line : -1;
    searchResults.forEach((result) => {
      result.forEach((location) => {
        allSearchResults += `Column: ${location.column} Line: ${location.line} Text: ${location.text} \n`
      })
      allSearchResults +=
        '*********************************************************************************\n'
    })
    console.log(`Search result column: ${searchResultCol}`)
    console.log(`Search result line: ${searchResultLine}`)

    res.json({ text: numberedPDFText, searchResults: allSearchResults, searchResultCol: searchResultCol, searchResultLine: searchResultLine })
  } catch (error) {
    // Logs the error and returns a 500 Internal Server Error response
    console.error('Error extracting text:', error)
    res.status(500).send('Error extracting text from PDF')
  }

})

app.listen(port, () => {
  console.log(`PDF text extraction API listening on port ${port}`)
})
