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

var tickets = [{tickettypepriceid: 9797, price: 19.95}]
var payload = {tickets: tickets}

api.post(client, "tickets", 5707, payload)
.then(r => console.log(r), e => console.log(e))
