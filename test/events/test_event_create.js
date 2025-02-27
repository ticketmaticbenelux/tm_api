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

const payload = {
    "name": "Test without endts",
    "startts": "2023-08-10T20:00:00.000Z",
    // "endts": "2023-08-10T22:10:00.000Z",
    "contingents": [
      {
        "name": "Vrije plaatskeuze",
        "amount": 10,
        "locks": [],
      }
    ],
    "seatingplanid": null,
    "subtitle": "Emily Atef"
  }

api.post(client, "events", null, payload)
.then(r => console.log(JSON.stringify(r)), e => console.log(e))