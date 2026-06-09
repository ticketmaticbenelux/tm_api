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

const ticket = {
    tickettypeid: 3340, 
    tickettypepriceid: 9952,
    c_kenteken: 'abc',
}

const payload = {
    orderid: 5721,
    paymentscenarioid: 10007,
    deliveryscenarioid: 10004,
    tickets: [
        ticket
    ],
    createdts: '2022-01-01 00:00:00',
    saleschannelid: 1,
}

console.log(payload)
const id = 5799

const main = async function() {
    await api.post(client, "reserve", null, {id:id});
    await api.post(client, "import", null, [payload])
        .then(r => console.log(JSON.stringify(r)), e => console.log(e))
}

main()
