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

api.put(client, "orders", 4803589, {
    deliverystatus: 2602,
})
.then(r => console.log(r.deliverystatus), e => console.log(e))