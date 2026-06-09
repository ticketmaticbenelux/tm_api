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

const payload = {
    "name": "Test prijstlijst 4",
}

api.put(client, "events", 11535, payload)
.then(r => console.log(JSON.stringify(r)), e => console.log(e))