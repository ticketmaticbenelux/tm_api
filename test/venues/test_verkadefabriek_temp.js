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
    "c_ypname": "Someday we’ll tell each other everything",
    "c_ypstartts": "2023-08-10T20:00:00.000Z",
    "c_ypendts": "2023-08-10T22:10:00.000Z",
    "c_yplocationid": null,
    "c_yplocationname": "VERWACHT",
    "c_ypproductionid": "9539497985-1688048075",
    "c_ypupdatets": "2023-06-30 13:06:34",
    "c_maccsboxfilm": "82010078",
    "c_bkhcode": "2320 Film",
    "c_production": 12411,
    "name": "Someday we’ll tell each other everything",
    "startts": "2023-08-10T20:00:00.000Z",
    "endts": "2023-08-10T22:10:00.000Z",
    "contingents": [
      {
        "name": "Vrije plaatskeuze",
        "amount": 27,
        "locks": [],
        "pricelistid": 10238
      }
    ],
    "seatingplanid": null,
    "c_genre": [
      10021
    ],
    "subtitle": "Emily Atef"
  }

api.put(client, "events", 137879, payload)
.then(r => console.log(JSON.stringify(r)), e => console.log(e))