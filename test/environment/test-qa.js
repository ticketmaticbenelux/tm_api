"use strict"

var env = require('node-env-file')

env(__dirname + '/../.env')

var api = require("../tm_api.js")

api.setDebug(true)

var client = {
	shortname: process.env.SHORTNAME_LOCAL,
	key: process.env.API_KEY_LOCAL,
	secret: process.env.API_SECRET_LOCAL
}

api.setSchema("https");
api.setHost("qa.ticketmatic.com");

//api.get(client, "contacts", 10000)
//.then(r => console.log(r), e=>console.log(e))

//api.put(client, "events", 10001, {"subtitle": "abc", "subtitle2": "abc"})i
//.then(r => console.log(r), e => console.log(e))

//api.put(client, "orders", 813, {"customfields":{"c_string": "abc"}})
//.then(r => console.log(r), e => console.log(e))

api.get(client, "flowinfo", "e3d67274-8443-42d9-8c7a-6db45af5a10d")
.then(r => console.log(r), e => console.log(e))
