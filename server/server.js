const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const cors = require('cors');
const pdfParse = require('pdf-parse');


const corsOptions = {
    origin: 'https://shiny-fortnight-jjr5jp7jjjvxhqvq4-4200.app.github.dev'
  };
  
  app.use(cors(corsOptions));
  
app.use(bodyParser.json());

app.post('/convert', async (req, res) => {
    console.log("Incoming request to /convert endpoint");
    try {
        const pdfUrl = req.body.url;
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        const response = await fetch(pdfUrl);
        const arrayBuffer = await response.arrayBuffer();
        // Convert ArrayBuffer to Buffer
        const data = Buffer.from(arrayBuffer);
        
        pdfParse(data).then(function(data) {
            res.send({ text: data.text });
        });
    } catch(error) {
        console.error("Error processing the request:", error);
        res.status(500).send("Something went wrong");
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
