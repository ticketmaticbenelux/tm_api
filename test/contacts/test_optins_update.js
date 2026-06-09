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
    optins: [
        {
            optinid: "1",
            status: 7602,
          },
          {
            id: 56,
            optinid: 2,
            status: 7601,
            info: { remarks: '' },
          }
    ]
}

api.put(client, "contacts", 10088, payload)
.then(r => console.log(r.optins), e => console.log(e))