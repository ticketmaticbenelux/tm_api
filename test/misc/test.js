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

async function getContacts() {
	const sql = `select * from tm.contact where id in (591,592)`
	return api.export(client, sql)
}

async function main() {
	const contacts = await getContacts()
	console.log(`Aantal contacten gevonden: ${contacts.length}`)
	
	for (const contact of contacts) {
		console.log(`- ${contact.firstname} ${contact.lastname} (${contact.id})`)
	}
}

main()
