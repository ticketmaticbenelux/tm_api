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

api.setSchema("http");
api.setHost("localhost:9001");

api.put(client, "pricelists", 1, {"name": "Test123"})
.then(r => console.log(r), e => console.log(e))
