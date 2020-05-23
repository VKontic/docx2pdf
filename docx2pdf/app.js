require("dotenv").config();

const express = require('express');
const hbs = require('hbs');
const upload = require("express-fileupload");
const util = require('util')
const fs = require('fs');
const nodemailer = require('nodemailer');
const convertapi = require('convertapi')(process.env.API_KEY);

const app = express();
app.use(upload());
app.use(express.urlencoded());
app.set('view engine', 'hbs');
app.use(express.static(__dirname + '/public'));

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'vkontic11@gmail.com',
        pass: process.env.PASSWORD
    }
});

app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

app.get('/', (req, res) => {
    res.render("home.hbs", {
        conversions: readconversionsFile() //send 
    });
})

app.post('/upload', function(req, res, next) {

    if (req.files.wordFile) {

        const file = req.files.wordFile;
        const name = file.name;
        const type = file.mimetype;
        const uploadpath = __dirname + '/uploads/' + name;

        if (type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            //validation on backend side (there is also front-end validation for doc type)
            file.mv(uploadpath, function(err) {
                if (err) {
                    res.send("File uploading error! ", error)
                } else {
                    convertapi.convert('pdf', { File: `uploads/${name}` }, 'docx')
                        .then(result => {
                            result.saveFiles(`storage/`)
                            let fileName = result.response.Files[0].FileName;
                            let url = result.response.Files[0].Url;
                            let conversionsNumber = incrementconversions();
                            deleteFile(name); //delete docx file from server storage
                            res.send({ fileName, url, conversionsNumber }); //frontu saljemo ime fajla, download link i br konvertovanja
                        })
                        .catch(error => {
                            console.log(error);
                            res.send({ success: "false" })
                        })
                }
            });
        } else {
            res.send("Bad extension!");
        }
    } else {
        res.send("No File selected !");
        res.end();
    };
})

app.post("/sendmail", function(req, res) {
    let email = req.body.email;
    let fileName = req.body.fileName;
    var mailOptions = {
        from: 'vkontic11@gmail.com',
        to: email,
        subject: 'PDF File',
        attachments: [{
            filename: `${fileName}`,
            path: `storage/${fileName}`
        }],
        text: 'Your PDF file is in attachment. \n\nRegards,\nVladimir Kontic',
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log(error);
            res.send({ success: "false" });
        } else {
            console.log('Email sent: ' + info.response);
            res.send({ success: "true" });
        }
    });
})

function readconversionsFile() {
    let data = fs.readFileSync(__dirname + '/public/conversionsNumber.txt');
    return data;
}

function incrementconversions() {
    let data = readconversionsFile();
    let newNumber = Number(data) + 1;
    fs.writeFileSync('public/conversionsNumber.txt', newNumber);
    return newNumber;
}

function deleteFile(fileName) {
    try {
        fs.unlinkSync(`uploads/${fileName}`);
    } catch (err) {

    }
}

app.listen(process.env.PORT);