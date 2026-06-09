"use strict"

var http = require('http')
var https = require('https')
var crypto = require('crypto')
var url = require('url')
var querystring = require('querystring')

http.globalAgent.maxSockets = 5
https.globalAgent.maxSockets = 5

var config = require('./tm3_api.json')

var limit = 100, query_limit = 1000

function formatUTCTimestamp() {
	var now = new Date()
	var y = now.getUTCFullYear()
	var mo = String(now.getUTCMonth() + 1).padStart(2, '0')
	var d = String(now.getUTCDate()).padStart(2, '0')
	var h = String(now.getUTCHours()).padStart(2, '0')
	var mi = String(now.getUTCMinutes()).padStart(2, '0')
	var s = String(now.getUTCSeconds()).padStart(2, '0')
	return y + '-' + mo + '-' + d + 'T' + h + ':' + mi + ':' + s
}

function getHeaders(client) {
	var key = client.key
	var auth_scheme = 'TM-HMAC-SHA256'
	var algorithm = 'sha256'
	var timestamp = formatUTCTimestamp()
	var payload = key + client.shortname + timestamp
	var hmac = crypto.createHmac(algorithm, client.secret)
	hmac.setEncoding('hex')
	hmac.write(payload)
	hmac.end()
	var signature = hmac.read()
	var auth_header = auth_scheme + ' key=' + key + ' ts=' + timestamp + ' sign=' + signature
	return { 'Authorization': auth_header }
}

function formatUrl(template, args) {
	var i = 0
	return template.replace(/%[sd]/g, function () {
		return i < args.length ? args[i++] : ''
	})
}

function getURL(client, type, endpoint, id) {
	var validTypes = ["getList", "get", "post", "put", "delete"]
	if (validTypes.indexOf(type) === -1) {
		return false
	}

	if (!(endpoint in config.endpoints)) {
		return false
	}

	var url_template = config.schema + "://" + config.host + config.path + config.endpoints[endpoint]

	if (type === "get" || type === "put" || type === "delete") {
		url_template += "/%d"
	}

	if (id) {
		if (typeof id === "object") {
			return formatUrl(url_template, [client.shortname, id[0], id[1]])
		}
		return formatUrl(url_template, [client.shortname, id])
	}

	return formatUrl(url_template, [client.shortname])
}

function getParams(payload) {
	if (typeof payload === "undefined") {
		return {}
	}

	var params = {}

	for (var key in payload) {
		if (config.params_optional.indexOf(key) !== -1) {
			console.log("Attribute skipped: %s", key)
			continue
		}

		params[key] = payload[key]
	}

	return params
}

function httpRequest(options) {
	return new Promise(function (resolve, reject) {
		var parsed = new url.URL(options.path)

		if (options.params && Object.keys(options.params).length > 0) {
			var keys = Object.keys(options.params)
			for (var i = 0; i < keys.length; i++) {
				parsed.searchParams.set(keys[i], options.params[keys[i]])
			}
		}

		var protocol = parsed.protocol === 'https:' ? https : http

		var reqHeaders = {
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		}

		if (options.headers) {
			var hkeys = Object.keys(options.headers)
			for (var j = 0; j < hkeys.length; j++) {
				reqHeaders[hkeys[j]] = options.headers[hkeys[j]]
			}
		}

		var body = null
		if (options.entity) {
			body = JSON.stringify(options.entity)
			reqHeaders['Content-Length'] = Buffer.byteLength(body)
		}

		var reqOptions = {
			hostname: parsed.hostname,
			port: parsed.port || undefined,
			path: parsed.pathname + parsed.search,
			method: options.method || 'GET',
			headers: reqHeaders
		}

		var req = protocol.request(reqOptions, function (res) {
			var chunks = []
			res.on('data', function (chunk) { chunks.push(chunk) })
			res.on('end', function () {
				var rawBody = Buffer.concat(chunks).toString()
				var entity
				try {
					entity = JSON.parse(rawBody)
				} catch (e) {
					entity = rawBody
				}
				resolve({
					status: { code: res.statusCode },
					entity: entity
				})
			})
		})

		req.on('error', reject)

		if (body) {
			req.write(body)
		}
		req.end()
	})
}

function request(options) {
	return httpRequest(options).then(function (data) {
		return new Promise(function (resolve, reject) {
			if (data.status.code === 200) {
				resolve(data.entity)
			} else {
				console.log({ message: "API request failed", options: options, response_code: data.status.code, response: data.entity })

				var message
				if (data.entity && data.entity.message) {
					message = data.entity.message
				} else {
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
exports.getListAll = function (client, endpoint, payload) {
	return getListRecursively(client, [], endpoint, payload)
}

function getListRecursively(client, data, endpoint, payload) {
	if (typeof payload === "undefined") {
		payload = {}
	}

	return exports.getList(client, endpoint, payload)
		.then(function (result) {
			if (!result) {
				return
			}

			data.push.apply(data, result.data)

			if (!result.data || result.data.length < limit) {
				return Promise.resolve(data)
			}

			if (!("offset" in payload)) {
				payload.offset = limit
				payload.limit = limit
			} else {
				payload.offset += limit
				payload.limit = limit
			}

			return getListRecursively(client, data, endpoint, payload)
		})
}

exports.getList = function (client, endpoint, payload) {
	var reqUrl = getURL(client, "getList", endpoint)

	if (!reqUrl) {
		return Promise.reject(new Error('Unknown getList: ' + endpoint))
	}

	var params = getParams(payload)
	var options = { method: 'GET', path: reqUrl, params: params }
	var headers = getHeaders(client)
	if (headers) {
		options['headers'] = headers
	}

	return request(options)
}

exports.get = function (client, endpoint, id, payload) {
	var reqUrl = getURL(client, "get", endpoint, id)

	if (!reqUrl) {
		return Promise.reject(new Error('Unknown get ' + endpoint))
	}

	var params = getParams(payload)
	var options = { method: 'GET', path: reqUrl, params: params }
	var headers = getHeaders(client)
	if (headers) {
		options['headers'] = headers
	}

	return request(options)
}

exports.put = function (client, endpoint, id, payload) {
	var reqUrl = getURL(client, "put", endpoint, id)

	if (!reqUrl) {
		return Promise.reject(new Error('Unknown put ' + endpoint))
	}

	if (Object.keys(payload).length === 0) {
		return Promise.resolve()
	}

	var entity = payload
	var options = { method: 'PUT', path: reqUrl, params: {}, entity: entity }
	var headers = getHeaders(client)
	if (headers) {
		options['headers'] = headers
	}

	return request(options)
}

var post = function (client, endpoint, id, payload) {
	var reqUrl = getURL(client, "post", endpoint, id)

	if (!reqUrl) {
		return Promise.reject(new Error('Unknown post ' + endpoint))
	}

	var entity = payload
	var options = { method: 'POST', path: reqUrl, params: {}, entity: entity }
	var headers = getHeaders(client)
	if (headers) {
		options['headers'] = headers
	}

	return request(options)
}
exports.post = post

var del = function (client, endpoint, id, payload) {
	var reqUrl = getURL(client, "delete", endpoint, id)

	if (!reqUrl) {
		return Promise.reject(new Error('Unknown delete ' + endpoint))
	}

	var entity = payload
	var options = { method: 'DELETE', path: reqUrl, params: {}, entity: entity }
	var headers = getHeaders(client)
	if (headers) {
		options['headers'] = headers
	}

	return request(options)
}
exports.del = del

/**
 * Recursively loop through API results using offset
 */
exports.queryAll = function (client, sql) {
	var payload = {
		query: sql,
		limit: query_limit
	}
	return queryRecursively(client, [], payload)
}

function queryRecursively(client, data, payload) {
	if (typeof payload === "undefined") {
		payload = {}
	}

	return _query(client, payload)
		.then(function (result) {
			if (!result.results) {
				return
			}

			data.push.apply(data, result.results)

			if (!result.results || result.results.length < query_limit) {
				return Promise.resolve(data)
			}

			if (!("offset" in payload)) {
				payload.offset = query_limit
				payload.limit = query_limit
			} else {
				payload.offset += query_limit
				payload.limit = query_limit
			}

			return queryRecursively(client, data, payload)
		})
}

function _query(client, payload) {
	return post(client, "queries", null, payload)
}

exports.query = function (client, sql) {
	var payload = {
		query: sql
	}
	return _query(client, payload)
		.then(function (res) { return res.results })
}
