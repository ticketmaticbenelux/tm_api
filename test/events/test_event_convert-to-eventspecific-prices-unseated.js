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

async function handleContingent(contingent) {
    const pricelistid = contingent.pricelistid;
    const pricelist = await api.get(client, "pricelists", pricelistid)
    const prices = pricelist.prices;
    return {
        id: contingent.id,
        pricelistid: null,
        eventspecificprices: prices,
    }
}

// Convert unseated pricelist to event-specific prices
async function main(eventid) {
    const ev = await api.get(client, "events", eventid)
    const contingents = await Promise.all(ev.contingents.map(handleContingent))
    const ev2 = await api.put(client, "events", eventid, {
        contingents,
    })
}

main(11534);

