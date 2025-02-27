"use strict"

var env = require('node-env-file')

env(__dirname + '/../.env')

var api = require("../tm_api_basicauth.js")

api.setDebug(true)

var client = {
	shortname: process.env.SHORTNAME,
	key: process.env.API_KEY,
	secret: process.env.API_SECRET
}

async function getEvents() {
	const sql = "select 'test\ntest2' as rolstoelen from tm.event where id in (11513)"
	return api.export(client, sql)
}

async function main() {
	const data = await getEvents()
    console.log(data[0])
}

main()
