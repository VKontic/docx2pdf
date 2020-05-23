const express = require('express');
const csv = require('csv-parser');
const app = express();
const cron = require("node-cron");

const { scrapRealiticaFlats, scrapSingleFlat } = require('./scraper');

cron.schedule("* * /30 * * * *", function() {
    // start 30 minutes after server starts, and then
    // update csv file every 30 min
    console.log("Cron job started!");
    scrapRealiticaFlats(0);
});

//localhost:3000/allflats -> will update csv file immediately
app.get('/allflats', async function(req, res) {
    const result = await scrapRealiticaFlats(0);
    res.send(result);
})

app.listen(3000, (err, data) => {
    if (!err) console.log("Started!");
})