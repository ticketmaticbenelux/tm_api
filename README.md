# tm_api

`tm_api` is a Node.js wrapper for the [Ticketmatic 3 API](https://www.ticketmatic.com/docs/api/).

## Installation

```
npm install node-env-file
npm install https://github.com/ticketmaticbenelux/tm_api
```

If you have a Node.js project with `package.json`, use `--save` to add the dependencies to `package.json`:

```
npm install --save node-env-file
npm install --save https://github.com/ticketmaticbenelux/tm_api
```

## Introduction

The package recognizes endpoints, and generates the right URL based on the endpoint and request type. See `tm3_api.json` for a list of the supported endpoints. Every request type has its own method and returns a Promise with the response data.

All methods expect the client as the first argument to support the functional programming paradigm.

Additionally you can use `api.getListAll` to recursively collect all results. Internally the `offset` parameter is being used.

With the `query` method you can execute a query on the public data model of Ticketmatic.

### Examples:

Get list of contacts:

```javascript
api.getList(client, "contacts")
```

Get contact:

```javascript
api.get(client, "contacts", 10000)
```

Create contact:

```javascript
let payload = {...}
api.post(client, "contacts", null, payload)
```

Update contact:

```javascript
let payload = {...}
api.put(client, "contacts", 10001, payload)
```

Delete contact:

```javascript
api.del(client, "contacts", 10002)
```

Execute query:

```javascript
let query = "select * from tm.contact"
api.query(client, query)
```

Execute query with a limit:

```javascript
let query = "select * from tm.contact"
api.query(client, query, 250)
```

Execute query with large number of results:

```javascript
let query = "select * from tm.contact"
api.export(client, query)
```

## Debug mode

To output API errors:

```
const api = require("tm_api")
api.setDebug(true)
```

## Usage

Create `.env` file with the right environment variables:

```
SHORTNAME=xxx
API_KEY=XXX
API_SECRET=xxx
```

Example of usage:

```javascript
const env = require('node-env-file')
env(__dirname + './.env')

const api = require("tm_api")

const client = {
	shortname: process.env.SHORTNAME,
	key: process.env.API_KEY,
	secret: process.env.API_SECRET
}

api.getList(client, "contacts")
.then(data => console.log(data))
```
