"use strict"

var env = require('node-env-file')

env(__dirname + '/../.env')

var api = require("../tm_api.js")

api.setDebug(true)

var client = {
	shortname: process.env.SHORTNAME_TEST,
	key: process.env.API_KEY_TEST,
	secret: process.env.API_SECRET_TEST
}

api.setHost("test.ticketmatic.com");

//api.get(client, "contacts", 1378793)
//.then(r => console.log(r.optins), e=>console.log(e))

const optins = [ 
    { 
        optinid: 1,
        status: 7602,
        info: { 
            ip: '92.111.236.233',
            method: 'backoffice',
            userid: 10034,
            remarks: 'ab',
            username: 'Rutger Weemhoff',
            useremail: 'rutger.weemhoff@ticketmatic.nl' 
        },
    } 
]

api.put(client, "contacts", 1378793, {optins})
.then(r => console.log(r), e => console.log(e))
