const express = require('express');
const bodyParser = require('body-parser'); // To parse incoming data
const app = express();
const port = 3000; // Or any other port you prefer

const cors = require('cors'); 
app.use(cors({
    origin: 'https://shiny-fortnight-jjr5jp7jjjvxhqvq4-4200.app.github.dev' 
  })); 
  
app.use(bodyParser.json()); 

app.post('/convert', (req, res) => {
    console.log("Incoming request to /convert endpoint"); // Print on incoming request 
    try {
        const text = req.body.text;
        const uppercaseText = text.toUpperCase();
        res.send({ uppercaseText });
    } catch(error) {
        console.error("Error processing the request:", error); // Catch any errors 
        res.status(500).send("Something went wrong"); 
    }
});


app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
 