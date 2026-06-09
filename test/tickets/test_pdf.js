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

var tickets = [399128]
var payload = {tickets, vouchercodes:[]}

api.post(client, "pdf", 5405, payload)
.then(r => console.log(r), e => console.log(e))
