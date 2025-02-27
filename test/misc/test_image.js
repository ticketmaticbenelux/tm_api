"use strict"

var env = require('node-env-file')
var path = require('path')

env(__dirname + '/../.env')

var api = require("../tm_api.js")

api.setDebug(true)

var client = {
	shortname: process.env.SHORTNAME,
	key: process.env.API_KEY,
	secret: process.env.API_SECRET
}

const filepath = `${__dirname}/logo.png`

api.saveimage(client, 11386, filepath)
.then(r => console.log(r), e => console.log(e))