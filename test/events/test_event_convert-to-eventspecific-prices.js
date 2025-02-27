"use strict"

var env = require('node-env-file')

env(__dirname + '/../.env')

var api = require("../tm_api.js")

api.setDebug(true)

var client = {
	shortname: process.env.SHORTNAME,
	key: process.env.API_KEY,
	secret: process.env.API_SECRET
}

// Convert seated pricelist to event-specific prices
async function main(eventid) {
    const ev  = await api.get(client, "events", eventid)
    console.log(ev)
    const pricelistid = ev.seatingplanpricelistid
    const pricelist = await api.get(client, "pricelists", pricelistid)
    const prices = pricelist.prices
    console.log(pricelist);
    const ev2 = await api.put(client, "events", eventid, {
        seatingplaneventspecificprices: prices,
        seatingplanpricelistid: null,
    })
    console.log(ev2)
}

main(11533);

