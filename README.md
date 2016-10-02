# tm_api

`tm_api` is a Node.js wrapper for the Ticketmatic 3 API.

## Installation

You need a Personal Access Token to be able to use this package.

Example of dependency in `package.json`:

```
  "dependencies": {
    "tm_api": "git+https://abcxyz:x-oauth-basic@github.com/rutgernation/tm_api.git"
  }
```

## Introduction

The package recognizes endpoints, and generates the right URL based on the endpoint and request type. See `tm3_api.json` for a list of the supported endpoints.

Every request type has its own method and returns a Promise with the response data.

```
api.get(client, endpoint, id, payload)
api.post(client, endpoint, id, payload)
api.put(client, endpoint, id, payload)
api.delete(client, endpoint, id, payload)
```

Examples:

Get contact:

```
api.get(client, "contacts", 10000)
```

Create contact:

```
let payload = {...}
api.post(client, "contacts", null, payload)
```

Update contact:

```
let payload = {...}
api.put(client, "contacts", 10001, payload)
```

Delete contact:

```
api.delete(client, "contacts", 10002)
```

## Usage

Example of usage:

```
var env = require('node-env-file')
env(__dirname + './.env')

var api = require("tm_api")

var client = {
	shortname: process.env.SHORTNAME,
	key: process.env.API_KEY,
	secret: process.env.API_SECRET
}

api.getList(client, "contacts")
.then(data => console.log(data))
```

