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

api.getListAll(client, "contacts", {lastupdatesince: "2018-04-10 12:00:00"})
.then(r => console.log(r.length), e => console.log(e))