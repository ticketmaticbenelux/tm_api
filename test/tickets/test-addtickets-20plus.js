"use strict"

var env = require('node-env-file')
const R = require('ramda')

env(__dirname + '/../.env')

var api = require("../tm_api.js")

api.setDebug(true)

var client = {
	shortname: process.env.SHORTNAME,
	key: process.env.API_KEY,
	secret: process.env.API_SECRET
}

const orderid = 2798066
const tickettypepriceid = 78855
const tickets = R.repeat({tickettypepriceid}, 22)
var payload = {tickets: tickets}

api.post(client, "tickets", orderid, payload)
.then(r => console.log(r), e => console.log(e))

//api.export(client, `select id from tm.order order by id desc`)
//.then(r=>console.log(r))

//api.get(client, "orders", 805)
//.then(r => console.log(r), e=>console.log(e))


//api.get(client, "contacts", 10016)
//.then(r => console.log(r), e=>console.log(e))

//const params = {orderby:"starttsdesc"}
//api.getList(client, "events", params)
//.then(r =>  console.log<(r), e => console.log(e))

//api.put(client, "events", 10001, {"subtitle": "abc", "subtitle2": "abc"})i
//.then(r => console.log(r), e => console.log(e))

//api.get(client, "flowinfo", "2979c984-c85d-4699-87e5-5b4aca654793")
//.then(r => console.log(r), e => console.log(e))

/*
async function main() {
	const res = await api.put(client, "split", 7777520, {tickettypepriceid: 1368, split3:null,split4:0.2,split1:2})
	console.log(res)
}
try {
	main()
}
catch (err) {
	console.log(err)
}
*/