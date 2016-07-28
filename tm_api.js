"use strict"

require('http').globalAgent.maxSockets = 5
require('https').globalAgent.maxSockets = 5

var rest = require('rest')
var mime = require('rest/interceptor/mime')
var moment = require('moment')
var crypto = require('crypto')
var util = require('util')

var client = rest.wrap(mime, { mime: 'application/json' })

var cache_enabled = ["AddressType", "PhoneType", "CustomerTitle", "RelationType", 'CustomerTitle', 'AddressType', 'PhoneType', "CustomFieldNewsletter"]
var cache_list = {}
var cache_list_promise = {}

var config = { api: require('./tm3_api.json'), authorization: {} }

config.api.base_url = config.api.schema + "://" + config.api.host + config.api.path

// API offset limit
var limit = 100

// TM3 Authorization header
function getHeaders() {
	var key, auth_scheme, algorithm, timestamp, payload, hmac, signature, auth_header
	key = config.authorization.key
	auth_scheme = 'TM-HMAC-SHA256'
	algorithm = 'sha256'
	timestamp = moment().utc().format('YYYY-MM-DDTHH:mm:ss')
	payload = key + config.authorization.shortname + timestamp
	hmac = crypto.createHmac(algorithm, config.authorization.secret)
	hmac.setEncoding('hex')
	hmac.write(payload)
	hmac.end()
	signature = hmac.read()
	auth_header = util.format('%s key=%s ts=%s sign=%s', auth_scheme, key, timestamp, signature)
	return {'Authorization': auth_header}
}

function getDefaultParams() {
	return {}
}

function getURL(method, type, id) {
	if(!(method in config.api.urls)) {
		return false
	}

	if(!(type in config.api.urls[method])) {
		return false
	}

	var str = config.api.base_url + config.api.urls[method][type]
	var url
	if(id) {
		if(typeof id == "object") {
			url = util.format(str, config.authorization.shortname, id[0], id[1])
		}
		else {
			url = util.format(str, config.authorization.shortname, id)
		}
	}
	else {
		url = util.format(str, config.authorization.shortname)
	}

	return url
}

/* Todo: Maak list() en get() DRY */

/**
 * Recursively loop through API results using offset
 * Returns Promise
 */
exports.listAll = function(type, payload) {
	return listRecursively([], type, payload)
}

function listRecursively(data, type, payload) {

	if (typeof payload == "undefined") {
		payload = {}
	}

	return listRaw(type, payload)
		.then(function(result) {

			if (!result.results) {
				return;
			}

			// More details on "spread": http://stackoverflow.com/a/30734348/3744180
			data.push(...result.results)

			if (!(result.results) || result.nbrofresults < (payload.offset+limit) ) {
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

			return listRecursively(data, type, payload)
		})
}

exports.list = function(type, payload)  {
	return listRaw(type, payload).then(res => {
		return res.results
	})
}

// returns Promise
exports.listRaw = function(type, payload) {

	var params = getDefaultParams()

	var url = getURL("list", type, null)

	if (!url) {
		return Promise.reject(new Error('Unknown list ' + type))
	}

	// use cache?
	if(type in cache_list) {
		return Promise.resolve(cache_list[type])
	}
	// use promise cache?
	else if(type in cache_list_promise) {
		return cache_list_promise[type].then(function(result) {
			return Promise.resolve(result)
		})
	}

	var method = "POST"
	var options = { method: method, path: url, entity: payload }
	var headers = getHeaders()
	if(headers) {
		options['headers'] = headers
	}

	var p = client(options).then(function(data) {
		return new Promise(function(resolve, reject) {
			if (data.status.code == 200) {
				if(cache_enabled.indexOf(type) >= 0) {
					// cache api result
					cache_list[type] = data.entity
				}
				resolve(data.entity)
			}
			else {
				app.logger.error({message: "API GET (list) failed: " + type, path: url, response_code: data.status.code, response: data.entity})

				var message
				if (data.entity.message) {
					message = data.entity.message
				}
				else {
					message = "Unknown error in API"
				}
				reject(new Error(message))
			}
		})
	})

	if(cache_enabled.indexOf(type) >= 0) {
		// cache promise
		cache_list_promise[type] = p
	}
	return p
}

/**
 * Recursively loop through API results using offset
 * Returns Promise
 */
exports.getAll = function(type, payload) {
	return getRecursively([], type, payload)
}

function getRecursively(data, type, payload) {

	if (typeof payload == "undefined") {
		payload = {}
	}

	return get(type, null, payload)
		.then(function(result) {

			if (!result) {
				return;
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

			return getRecursively(data, type, payload)
		})
}

// returns Promise
exports.get = function(type, id, payload) {

	var params = getDefaultParams()

	var url = getURL("get", type, id)

	if (!url) {
		return Promise.reject(new Error('Unknown get ' + type))
	}

	if(typeof payload !== "undefined") {
		for(var key in payload) {
			// Skip non-allowed optional attributes
			if (app.config.api.tm3.params_optional.indexOf(key) == -1) {
				console.log("Attribute skipped: %s", key)
				continue
			}

			params[key] = payload[key]
		}
	}

	var options = { path: url, params: params }
	var headers = getHeaders()
	if(headers) {
		options['headers'] = headers
	}

	return client(options).then(function(data) {
		return new Promise(function(resolve, reject) {
			if (data.status.code == 200) {
				resolve(data.entity)
			}
			else {
				app.logger.error({message: "API GET failed", path: url, response_code: data.status.code, response: data.entity})

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

exports.put = function(type, id, payload) {

	var params = getDefaultParams()

	var url = getURL("put", type, id)

	if (!url) {
		return Promise.reject(new Error('Unknown put ' + type))
	}

	if(Object.keys(payload).length == 0) {
		return Promise.resolve()
	}

	var entity = payload
	var options = { method: 'PUT', path: url, params: params, entity: entity }
	var headers = getHeaders()
	if(headers) {
		options['headers'] = headers
	}

	return client(options).then(function(data) {
		return new Promise(function(resolve, reject) {
			if (data.status.code == 200) {
				return resolve(data.entity)
			}
			else {
				app.logger.error({message: "API PUT failed", payload: payload, entity: entity, path: url, response_code: data.status.code, response: data.entity})

				var message
				if (data.entity.message) {
					message = data.entity.message
				}
				else {
					message = "Onbekende fout in API"
				}
				return reject(new Error(message))
			}
		})
	})
}

exports.post = function(type, id, payload) {

	var params = getDefaultParams()

	var url = getURL("post", type, id)

	if (!url) {
		return Promise.reject(new Error('Unknown post ' + type))
	}

	var entity = payload
	var options = { method: 'POST', path: url, params: params, entity: entity }
	var headers = getHeaders()
	if(headers) {
		options['headers'] = headers
	}

	return client(options)
	.then(function(data) {
		return new Promise(function(resolve, reject) {
			if (data.status.code == 200) {

				if(type == "contact") {
					return resolve(data.entity.id)
				}

				return resolve(data.entity)
			}
			else {
				app.logger.error({message: "API POST failed", payload: payload, path: url, response_code: data.status.code, response: data.entity})
				console.log(util.inspect(data.entity, {depth: 4}))

				var message
				if (data.entity.message) {
					message = data.entity.message
				}
				else {
					message = "Onbekende fout in API"
				}
				return reject(new Error(message))
			}
		})
	})
}

exports.setApi = function(_api) {
	config.api = _api
	config.api.base_url = _api.schema + "://" + _api.host + _api.path
}

exports.setAuthorization = function(_authorization) {
	config.authorization = _authorization
}