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

// Normaal 244881
// Solo 244879
var tickets = [{tickettypepriceid: 244879}]
var payload = {tickets: tickets}

api.post(client, "tickets", 21109903, payload)
.then(r => console.log(r), e => console.log(e))
