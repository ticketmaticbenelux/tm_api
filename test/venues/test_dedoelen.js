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

// Solo 244879
var payload = {email: "rutger+15@ticketmatic.nl"}

api.post(client, "contacts", null, payload)
.then(r => console.log(r), e => console.log(e))
