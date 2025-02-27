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

api.getListAll(client, "events", {lastupdatesince: "2021-09-01 12:00:00", output: "minimal"})
.then(r => console.log(r), e => console.log(e))