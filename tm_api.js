"use strict"

require('http').globalAgent.maxSockets = 5
require('https').globalAgent.maxSockets = 5

var rest = require('rest'),
	mime = require('rest/interceptor/mime'),
	moment = require('moment'),
	crypto = require('crypto'),
	util = require('util'),
	R = require('ramda')

var client = rest.wrap(mime, { mime: 'application/json' })

var config = require('./tm3_api.json')

// API offset limit
var limit = 100

// TM3 Authorization header
function getHeaders(client) {
	var key, auth_scheme, algorithm, timestamp, payload, hmac, signature, auth_header
	key = client.key
	auth_scheme = 'TM-HMAC-SHA256'
	algorithm = 'sha256'
	timestamp = moment().utc().format('YYYY-MM-DDTHH:mm:ss')
	payload = key + client.shortname + timestamp
	hmac = crypto.createHmac(algorithm, client.secret)
	hmac.setEncoding('hex')
	hmac.write(payload)
	hmac.end()
	signature = hmac.read()
	auth_header = util.format('%s key=%s ts=%s sign=%s', auth_scheme, key, timestamp, signature)
	return {'Authorization': auth_header}
}

function getURL(client, type, endpoint, id) {
	if(!(R.contains(type, ["getList", "get", "post", "put"]))) {
		return false
	}

	if(!(endpoint in config.endpoints)) {
		return false
	}

	var url_template = config.schema + "://" + config.host + config.path + config.endpoints[endpoint]

	if(type == "get" || type == "put") {
		url_template += "/%d"
	}

	var url
	if(id) {
		if(typeof id == "object") {
			url = util.format(url_template, client.shortname, id[0], id[1])
		}
		else {
			url = util.format(url_template, client.shortname, id)
		}
	}
	else {
		url = util.format(url_template, client.shortname)
	}

	return url
}

function getParams(payload) {
	if(typeof payload === "undefined") {
		return {}
	}

	var params = {}
	
	for(var key in payload) {
		
		// Skip non-allowed optional attributes
		if (R.contains(key, config.params_optional)) {
			console.log("Attribute skipped: %s", key)
			continue
		}

		params[key] = payload[key]
	}

	return params
}

function request(options) {
	return client(options).then(function(data) {
		return new Promise(function(resolve, reject) {
			if (data.status.code == 200) {
				resolve(data.entity)
			}
			else {
				app.logger.error({message: "API request failed", options: options, response_code: data.status.code, response: data.entity})

				var message
				if (data.entity.message) {
					message = data.entity.message
				}
				else {
					message = "Onbekende fout in API"
				}
				reject(new Error(message))
			}
		})
	})
}

/**
 * Recursively loop through API results using offset
 */
exports.getListAll = function(client, endpoint, payload) {
	return getRecursively(client, [], endpoint, payload)
}

function getListRecursively(client, data, endpoint, payload) {

	if (typeof payload == "undefined") {
		payload = {}
	}

	return getList(client, endpoint, payload)
		.then(function(result) {

			if (!result) {
				return
			}

			// More details on "spread": http://stackoverflow.com/a/30734348/3744180
			data.push(...result.data)

			if (!(result.data) || result.data.length < limit) {
				return Promise.resolve(data)
			}

			if (!("offset" in payload)) {
				payload.offset = limit
				payload.limit = limit
			}
			else {
				payload.offset += limit
				payload.limit = limit
			}

			return getRecursively(client, data, endpoint, payload)
		})
}

exports.getList = function(client, endpoint, payload) {

	var url = getURL(client, "getList", endpoint)

	if (!url) {
		return Promise.reject(new Error('Unknown getList: ' + endpoint))
	}

	var params = getParams(payload)
	var options = { method: 'GET', path: url, params: params }
	var headers = getHeaders(client)
	if(headers) {
		options['headers'] = headers
	}

	return request(options)
}

exports.get = function(client, endpoint, id, payload) {

	var url = getURL(client, "get", endpoint, id)

	if (!url) {
		return Promise.reject(new Error('Unknown get ' + endpoint))
	}

	var params = getParams(payload)
	var options = { method: 'GET', path: url, params: params }
	var headers = getHeaders(client)
	if(headers) {
		options['headers'] = headers
	}

	return request(options)
}

exports.put = function(client, endpoint, id, payload) {

	var url = getURL(client, "put", endpoint, id)

	if (!url) {
		return Promise.reject(new Error('Unknown put ' + endpoint))
	}

	if(Object.keys(payload).length == 0) {
		return Promise.resolve()
	}

	var entity = payload
	var options = { method: 'PUT', path: url, params: {}, entity: entity }
	var headers = getHeaders(client)
	if(headers) {
		options['headers'] = headers
	}

	return request(options)
}

exports.post = function(client, endpoint, id, payload) {

	var url = getURL(client, "post", endpoint, id)

	if (!url) {
		return Promise.reject(new Error('Unknown post ' + endpoint))
	}

	var entity = payload
	var options = { method: 'POST', path: url, params: {}, entity: entity }
	var headers = getHeaders(client)
	if(headers) {
		options['headers'] = headers
	}

	return request(options)
}