const cheerio = require("cheerio");
const axios = require("axios").default;
const htmlToText = require('html-to-text');
const fs = require('fs');
const csvWriter = require('csv-write-stream')
const csv = require('csv-parser');


async function fetchHtml(url) {
    try {
        const { data } = await axios.get(url);
        return data;
    } catch (err) {
        console.log(`An error occurred while trying to fetch the URL ${url} `, err);
    }
}

async function scrapRealiticaFlats(pageNumber) {
    if (pageNumber == 101) { //on realitica site there is always 100 pages of renting flats offers
        console.log("Writing to csv file finished!");
        return;
    }
    const url = `https://www.realitica.com/?cur_page=${pageNumber}&for=DuziNajam&pZpa=Crna+Gora&pState=Crna+Gora&type%5B%5D=Home&type%5B%5D=Apartment&lng=hr`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const flatsLinks = $("body").find('.thumb_div > a').toArray().map(elem => $(elem).attr('href'));
    flatsLinks.forEach(flatLink => scrapSingleFlat(flatLink));
    if (pageNumber % 10 == 0 && pageNumber !== 0) {
        console.log(`Processed ${pageNumber} out of 100 pages from realitica. Please wait...`)
    }
    scrapRealiticaFlats(pageNumber + 1);
};

async function scrapSingleFlat(url) {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const searchResults = $("body").find("#listing_body");
    const text = htmlToText.fromString(searchResults);

    let flatObject = extractInfo(text);

    flatObject["Više detalja na"] = findFlatWebSite($);
    flatObject["Slike"] = findImages($);
    writeToCsv(flatObject);
}

function findFlatWebSite($) {
    let siteIndex = $("body").find('#listing_body').text().search("Više detalja na");
    if (siteIndex !== -1) {
        let link = $("body").find('#aboutAuthor a').attr('href');
        return link;
    } else {
        return "/";
    }
}

function findImages($) {
    let searchImagesLinks = $("body").find('.fancybox').toArray().map(elem => $(elem).attr('href'));
    for (let i = 0; i < searchImagesLinks.length; i++) {
        if (!searchImagesLinks[i].startsWith('https://www.realitica.com')) {
            searchImagesLinks[i] = 'https://www.realitica.com' + searchImagesLinks[i];
        }
    }
    let imagesLinksString = searchImagesLinks.join(' AND ');
    if (imagesLinksString == "") {
        return "Nema slika";
    }
    return imagesLinksString;
}

function writeToCsv(flatObject) {
    let csvReader = fs.createReadStream('flats.csv');

    csvReader
        .pipe(csv())
        .on('data', (row) => {
            if (row["Oglas Broj"] == flatObject["Oglas Broj"]) {
                csvReader.close(); //dont append ad to file because it is already in csv
            }
        })
        .on('end', () => {
            //if we finished file reading and passed fillter, then we should append new flat ad to csv file
            let writer = csvWriter({ sendHeaders: false });
            writer.pipe(fs.createWriteStream('flats.csv', { flags: 'a' })) // flag 'a' - append, not overwrite
            writer.write(flatObject);
            writer.end();
        });
}

function extractInfo(rawText) {

    let flatObject = defaultObject();
    let [desc, phoneNumber, text] = extractAndRemoveDescAndPhone(rawText); //Desc and phone could contain many new lines so I manually find it before spliting text on line breaks
    flatObject.Opis = desc;
    flatObject.Mobitel = phoneNumber;

    let arr = text.split('\n');
    arr = arr.filter(elem => elem.length > 5);
    flatObject.Naslov = arr[0];

    for (let i = 1; i < arr.length; i++) { //started from index 1 because we have already added heading
        let colonIndex = arr[i].search(':');
        if (colonIndex !== -1) {
            let key = arr[i].substring(0, colonIndex);
            let value = arr[i].substring(colonIndex + 1).trim();
            if (flatObject.hasOwnProperty(key)) {
                flatObject[key] = value;
            }
        } else if (flatObject.hasOwnProperty(arr[i])) {
            flatObject[arr[i]] = true;
        }
    }

    flatObject.Url = `https://www.realitica.com/hr/listing/${flatObject["Oglas Broj"]}`;
    return flatObject
}

function extractAndRemoveDescAndPhone(rawText) {
    const descIndex = rawText.search("Opis:");
    const siteIndex = rawText.search("Više detalja na:");
    let tagsIndex = rawText.search("Tags:"); //tags section will be removed from rawText string also

    let desc = rawText.substring(descIndex + 6, siteIndex).replace(/\n/g, ' '); //remove new lines from desc
    let rawTextWithoutDesc = rawText.substring(0, descIndex) + rawText.substring(siteIndex, tagsIndex);

    if (siteIndex == -1) {
        const advertisedByIndex = rawText.search("Oglasio:");
        desc = rawText.substring(descIndex + 6, advertisedByIndex).replace(/\n/g, ' ');
        rawTextWithoutDesc = rawText.substring(0, descIndex) + rawText.substring(advertisedByIndex, tagsIndex);
    }

    rawTextWithoutDesc = replaceBadSymbols(rawTextWithoutDesc);

    let mobileIndex = rawTextWithoutDesc.search("Mobitel: ");
    let telIndex = rawTextWithoutDesc.search("Telefon: ");
    let mob = rawTextWithoutDesc.substring(mobileIndex, telIndex).replace(/\n/g, ' '); //special case when number is long few lines
    textWithoutDescAndNumber = rawTextWithoutDesc.substring(0, mobileIndex) + rawTextWithoutDesc.substring(telIndex);

    return [desc, mob, textWithoutDescAndNumber];
}

function replaceBadSymbols(text) {
    text = text.replace(/Cijena: €/g, "Cijena: ").replace(/m2/g, "").replace(/;/g, " | ").replace(/\[\/.*]/g, "");
    return text;
}

function defaultObject() {
    let defaultFlatObject = {
        "Vrsta": "Stan",
        "Područje": "Crna Gora",
        "Lokacija": "Crna Gora",
        "Spavaćih Soba": "/",
        "Kupatila": "/",
        "Cijena": "/",
        "Stambena Površina": "/",
        "Zemljište": "/",
        "Parking Mjesta": "/",
        "Od Mora (m)": "/",
        "Novogradnja": false,
        "Klima Uređaj": false,
        "Naslov": null,
        "Opis": null,
        "Više detalja na": null,
        "Oglasio": null,
        "Mobitel": null,
        "Oglas Broj": "/",
        "Zadnja Promjena": null,
        "Slike": null,
        "Url": null
    }
    return defaultFlatObject;
}


module.exports = { scrapRealiticaFlats, scrapSingleFlat }