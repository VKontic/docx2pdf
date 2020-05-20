const express = require('express')
const app = express()
const hbs = require('hbs');
app.listen(3000);

console.log("TEST");

app.use(express.static(__dirname + '/public'));
app.set('view engine', 'hbs');

app.get('/', (req, res)=>{
	res.render("home.hbs");
})


