"use strict"

var env = require('node-env-file')

env(__dirname + '/../.env')

var api = require("../tm_api.js")

var client = {
	shortname: process.env.SHORTNAME,
	key: process.env.API_KEY,
	secret: process.env.API_SECRET
}

api.export(client, "select id from tm.contact")
.then(r => console.log(r), e => console.log(e))