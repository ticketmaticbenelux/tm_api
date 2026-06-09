"use strict"

var http = require('http')
var https = require('https')
var crypto = require('crypto')
var url = require('url')
var fs = require('fs')

http.globalAgent.maxSockets = 5
https.globalAgent.maxSockets = 5

const config = require('./tm3_api.json')

let counter

const LIMIT = 1000
const QUERY_LIMIT = 1000

function listContains(val, list) {
	return list.indexOf(val) !== -1
}

function clone(obj) {
	return JSON.parse(JSON.stringify(obj))
}

function deepMerge(target, source) {
	for (var key in source) {
		if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
			target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
			deepMerge(target[key], source[key])
		} else {
			target[key] = source[key]
		}
	}
	return target
}

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
	if (!listContains(type, ['getList', 'get', 'post', 'put', 'delete'])) {
		return false
	}

	if (!(endpoint in config.endpoints)) {
		return false
	}

	var url_template = config.schema + '://' + config.host + config.path + config.endpoints[endpoint]

	if ((type === 'get' || type === 'put' || type === 'delete') && !listContains(endpoint, config.no_extra_param)) {
		url_template += '/%s'
	}

	var shortname = client.shortname || '_'
	if (id) {
		if (typeof id === 'object') {
			return formatUrl(url_template, [shortname, id[0], id[1]])
		}
		return formatUrl(url_template, [shortname, id])
	}

	return formatUrl(url_template, [shortname])
}

function getParams(payload) {
	if (typeof payload === 'undefined') {
		return {}
	}

	var params = {}

	for (var key in payload) {
		if (!listContains(key, config.params_optional)) {
			console.log("Attribute skipped: %s", key)
			continue
		}

		params[key] = payload[key]
	}

	return params
}

function buildRequestOptions(options) {
	var parsed = new url.URL(options.path)

	if (options.params && Object.keys(options.params).length > 0) {
		var keys = Object.keys(options.params)
		for (var i = 0; i < keys.length; i++) {
			parsed.searchParams.set(keys[i], options.params[keys[i]])
		}
	}

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

	var reqOptions = {
		hostname: parsed.hostname,
		port: parsed.port || undefined,
		path: parsed.pathname + parsed.search,
		method: options.method || 'GET',
		headers: reqHeaders,
		protocol: parsed.protocol
	}

	return { reqOptions: reqOptions, parsed: parsed }
}

function httpRequest(options) {
	return new Promise(function (resolve, reject) {
		var built = buildRequestOptions(options)
		var reqOptions = built.reqOptions
		var protocol = reqOptions.protocol === 'https:' ? https : http

		var body = null
		if (options.entity) {
			body = JSON.stringify(options.entity)
			reqOptions.headers['Content-Length'] = Buffer.byteLength(body)
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

function httpRequestBinary(options) {
	return new Promise(function (resolve, reject) {
		var built = buildRequestOptions(options)
		var reqOptions = built.reqOptions
		var protocol = reqOptions.protocol === 'https:' ? https : http

		delete reqOptions.headers['Content-Type']
		delete reqOptions.headers['Accept']

		if (options.headers) {
			var hkeys = Object.keys(options.headers)
			for (var j = 0; j < hkeys.length; j++) {
				reqOptions.headers[hkeys[j]] = options.headers[hkeys[j]]
			}
		}

		var req = protocol.request(reqOptions, function (res) {
			var chunks = []
			res.on('data', function (chunk) { chunks.push(chunk) })
			res.on('end', function () {
				if (res.statusCode === 401) {
					reject(new Error("TM API responds with status 'Unauthorized'"))
					return
				}
				if (res.statusCode !== 200) {
					reject(new Error('TM API error with status ' + res.statusCode))
					return
				}
				resolve(Buffer.concat(chunks))
			})
		})

		req.on('error', function (err) {
			reject(new Error('TM API Error: ' + err.message))
		})

		if (options.bodyStream) {
			options.bodyStream.pipe(req)
		} else {
			req.end()
		}
	})
}

function httpRequestStream(options) {
	return new Promise(function (resolve, reject) {
		var built = buildRequestOptions(options)
		var reqOptions = built.reqOptions
		var protocol = reqOptions.protocol === 'https:' ? https : http

		var body = null
		if (options.entity) {
			body = JSON.stringify(options.entity)
			reqOptions.headers['Content-Length'] = Buffer.byteLength(body)
		}

		var req = protocol.request(reqOptions, function (res) {
			if (res.statusCode === 401) {
				reject(new Error("TM API responds with status 'Unauthorized'"))
				res.resume()
				return
			}
			if (res.statusCode !== 200) {
				reject(new Error('TM API error with status ' + res.statusCode))
				res.resume()
				return
			}
			resolve(res)
		})

		req.on('error', function (err) {
			reject(new Error('TM API Error: ' + err.message))
		})

		if (body) {
			req.write(body)
		}
		req.end()
	})
}

function parseNdjsonStream(stream) {
	return new Promise(function (resolve, reject) {
		var arr = []
		var buffer = ''

		stream.on('data', function (chunk) {
			buffer += chunk.toString()
			var lines = buffer.split('\n')
			buffer = lines.pop()
			for (var i = 0; i < lines.length; i++) {
				if (lines[i].trim()) {
					arr.push(JSON.parse(lines[i]))
				}
			}
		})

		stream.on('end', function () {
			if (buffer.trim()) {
				arr.push(JSON.parse(buffer))
			}
			resolve(arr)
		})

		stream.on('error', reject)
	})
}

function _request(options) {
	return httpRequest(options).then(function (data) {
		return new Promise(function (resolve, reject) {
			if (data.status.code === 200) {
				resolve(data.entity)
			} else {
				if (config.debug) {
					console.log({ message: 'API request failed', options: options, response_code: data.status.code, response: data.entity })
				}

				var response = typeof data.entity === 'string' ? JSON.parse(data.entity) : data.entity
				var message
				if (response.message && response.error) {
					message = response.message + ': ' + response.error
				} else if (response.message) {
					message = response.message
				} else {
					message = 'Unknown error in Ticketmatic API'
				}
				reject(message)
			}
		})
	})
}

/**
 * Recursively loop through API results using offset
 */
exports.getListAll = function (client, endpoint, payload) {
	counter.get += 1
	return getListRecursively(client, [], endpoint, payload)
}

exports.getListAllWithLookup = function (client, endpoint, payload) {
	counter.get += 1
	var initial = {
		data: [],
		lookup: {}
	}
	return getListRecursivelyWithLookup(client, initial, endpoint, payload)
}

function getListRecursively(client, data, endpoint, payload) {
	if (typeof payload === 'undefined') {
		payload = {}
	}
	if (!('limit' in payload)) {
		payload.limit = LIMIT
	}

	return _getList(client, endpoint, payload).then(function (result) {
		if (!result) {
			return
		}

		data.push.apply(data, result.data)

		if (!result.data || result.data.length < LIMIT) {
			return data
		}

		if (!('offset' in payload)) {
			payload.offset = LIMIT
			payload.limit = LIMIT
		} else {
			payload.offset += LIMIT
			payload.limit = LIMIT
		}

		return getListRecursively(client, data, endpoint, payload)
	})
}

function getListRecursivelyWithLookup(client, accum, endpoint, payload) {
	if (typeof payload === 'undefined') {
		payload = {}
	}
	if (!('limit' in payload)) {
		payload.limit = LIMIT
	}
	if (!('output' in payload)) {
		payload.output = 'withlookup'
	}

	return _getList(client, endpoint, payload).then(function (result) {
		if (!result) {
			console.log('No result')
			return accum
		}

		accum.data.push.apply(accum.data, result.data)
		deepMerge(accum.lookup, result.lookup)

		if (!result.data || result.data.length < LIMIT) {
			return accum
		}

		if (!('offset' in payload)) {
			payload.offset = LIMIT
			payload.limit = LIMIT
		} else {
			payload.offset += LIMIT
			payload.limit = LIMIT
		}

		return getListRecursivelyWithLookup(client, accum, endpoint, payload)
	})
}

function _getList(client, endpoint, payload) {
	var reqUrl = getURL(client, 'getList', endpoint)

	if (!reqUrl) {
		return Promise.reject(new Error('Unknown getList: ' + endpoint))
	}

	var params = getParams(payload)
	var options = { method: 'GET', path: reqUrl, params: params }
	var headers = getHeaders(client)
	if (headers) {
		options.headers = headers
	}

	return _request(options)
}

exports.getList = function (client, endpoint, payload) {
	counter.get += 1
	return _getList(client, endpoint, payload)
}

exports.get = function (client, endpoint, id, payload) {
	var reqUrl = getURL(client, 'get', endpoint, id)

	if (!reqUrl) {
		return Promise.reject(new Error('Unknown get ' + endpoint))
	}

	var params = getParams(payload)
	var options = { method: 'GET', path: reqUrl, params: params }
	var headers = getHeaders(client)
	if (headers) {
		options.headers = headers
	}

	counter.get += 1
	return _request(options)
}

exports.put = function (client, endpoint, id, payload) {
	var reqUrl = getURL(client, 'put', endpoint, id)

	if (!reqUrl) {
		return Promise.reject(new Error('Unknown put ' + endpoint))
	}

	if (!payload) {
		return Promise.reject('[TM API] No payload for PUT request.')
	}

	if (Object.keys(payload).length === 0) {
		return Promise.resolve()
	}

	var options = { method: 'PUT', path: reqUrl, params: {}, entity: payload }
	var headers = getHeaders(client)
	if (headers) {
		options.headers = headers
	}

	counter.put += 1
	return _request(options)
}

var _post = function (client, endpoint, id, payload) {
	var reqUrl = getURL(client, 'post', endpoint, id)

	if (!reqUrl) {
		return Promise.reject(new Error('Unknown post ' + endpoint))
	}

	var options = { method: 'POST', path: reqUrl, params: {}, entity: payload }
	var headers = getHeaders(client)
	if (headers) {
		options.headers = headers
	}

	return _request(options)
}

exports.post = function (client, endpoint, id, payload) {
	counter.post += 1
	return _post(client, endpoint, id, payload)
}

exports.del = function (client, endpoint, id, payload) {
	var reqUrl = getURL(client, 'delete', endpoint, id)

	if (!reqUrl) {
		return Promise.reject(new Error('Unknown delete ' + endpoint))
	}

	var options = { method: 'DELETE', path: reqUrl, params: {}, entity: payload }
	var headers = getHeaders(client)
	if (headers) {
		options.headers = headers
	}

	counter.delete += 1
	return _request(options)
}

/**
 * Recursively loop through API results using offset
 */
exports.queryAll = function (client, sql) {
	var payload = {
		query: sql,
		limit: QUERY_LIMIT
	}

	counter.query += 1
	return queryRecursively(client, [], payload)
}

function queryRecursively(client, data, payload) {
	if (typeof payload === 'undefined') {
		payload = {}
	}

	return _query(client, payload).then(function (result) {
		if (!result.results) {
			return
		}

		data.push.apply(data, result.results)

		if (!result.results || result.results.length < QUERY_LIMIT) {
			return data
		}

		if (!('offset' in payload)) {
			payload.offset = QUERY_LIMIT
			payload.limit = QUERY_LIMIT
		} else {
			payload.offset += QUERY_LIMIT
			payload.limit = QUERY_LIMIT
		}

		return queryRecursively(client, data, payload)
	})
}

function _query(client, payload) {
	return _post(client, 'queries', null, payload)
}

exports.query = function (client, sql, limit) {
	var payload = {
		limit: limit,
		query: sql
	}

	counter.query += 1
	return _query(client, payload).then(function (res) {
		return res.results
	})
}

exports.export = function (client, sql) {
	var reqUrl = getURL(client, 'post', 'export')

	var options = {
		method: 'POST',
		path: reqUrl,
		params: {},
		entity: { query: sql }
	}
	var headers = getHeaders(client)
	if (headers) {
		options.headers = headers
	}

	counter.export += 1

	return httpRequestStream(options).then(function (stream) {
		return parseNdjsonStream(stream)
	})
}

exports.saveimage = function (client, id, filepath) {
	var reqUrl = getURL(client, 'post', 'saveimage', id)

	var options = {
		method: 'POST',
		path: reqUrl,
		params: {},
		bodyStream: fs.createReadStream(filepath)
	}
	var headers = getHeaders(client)
	if (headers) {
		options.headers = headers
	}

	counter.post += 1
	return httpRequestBinary(options)
}

exports.setDebug = function (input) {
	config.debug = !!input
}

exports.setSchema = function (schema) {
	if (!listContains(schema, ['http', 'https'])) {
		console.log('Could not set schema: %s', schema)
		return
	}

	config.schema = schema
}

exports.setHost = function (host) {
	if (!listContains(host, ['apps.ticketmatic.com', 'test.ticketmatic.com', 'qa.ticketmatic.com', 'localhost'])) {
		console.log('Could not set host: %s', host)
		return
	}
	if (host === 'localhost') {
		config.host = host + ':9002'
		config.schema = 'http'
	} else {
		config.host = host
	}
}

exports.getStats = function () {
	return clone(counter)
}

var resetStats = function () {
	counter = { get: 0, put: 0, post: 0, delete: 0, query: 0, export: 0 }
}
resetStats()

exports.resetStats = resetStats
