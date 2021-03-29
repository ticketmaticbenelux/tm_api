"use strict"

require('http').globalAgent.maxSockets = 5
require('https').globalAgent.maxSockets = 5

const axios = require('axios')
const fs = require('fs')
const rest = require('rest')
const mime = require('rest/interceptor/mime')
const params = require('rest/interceptor/params')
const moment = require('moment')
const crypto = require('crypto')
const util = require('util')
const R = require('ramda')
const split = require('split')

const client = rest.wrap(mime, { mime: 'application/json' }).wrap(params)

const config = require('./tm3_api.json')

let counter

// API offset limit
const LIMIT = 100
const QUERY_LIMIT = 1000

// TM3 Authorization header
function getHeaders(client) {
	const key = client.key
	const auth_scheme = 'TM-HMAC-SHA256'
	const algorithm = 'sha256'
	const timestamp = moment().utc().format('YYYY-MM-DDTHH:mm:ss')
	const payload = key + client.shortname + timestamp
	const hmac = crypto.createHmac(algorithm, client.secret)
	hmac.setEncoding('hex')
	hmac.write(payload)
	hmac.end()
	const signature = hmac.read()
	const auth_header = util.format('%s key=%s ts=%s sign=%s', auth_scheme, key, timestamp, signature)
	return {'Authorization': auth_header}
}

function getURL(client, type, endpoint, id) {
	if (!(R.contains(type, ['getList', 'get', 'post', 'put', 'delete']))) {
		return false
	}

	if (!(endpoint in config.endpoints)) {
		return false
	}

	var url_template = config.schema + '://' + config.host + config.path + config.endpoints[endpoint]

	if ((type == 'get' || type == 'put' || type == 'delete') && !R.contains(endpoint,config.no_extra_param)) {
		url_template += '/%s'
	}

	var url
	if (id) {
		if (typeof id == 'object') {
			url = util.format(url_template, client.shortname || "_", id[0], id[1])
		}
		else {
			url = util.format(url_template, client.shortname || "_", id)
		}
	}
	else {
		url = util.format(url_template, client.shortname || "_")
	}

	return url
}

function getParams(payload) {
	if (typeof payload === 'undefined') {
		return {}
	}

	var params = {}

	for(var key in payload) {

		// Skip non-allowed optional attributes
		if (!R.contains(key, config.params_optional)) {
			console.log("Attribute skipped: %s", key)
			continue
		}

		params[key] = payload[key]
	}

	return params
}

async function _request(options) {
	const data = await client(options)
	return new Promise(function(resolve, reject) {
		if (data.status.code == 200) {
			resolve(data.entity)
		}
		else {
			if (config.debug) {
				console.log({message: 'API request failed', options: options, response_code: data.status.code, response: data.entity})
			}

			var message
			if (data.entity.message) {
				message = data.entity.message
			}
			else {
				message = 'Unknown error in Ticketmatic API'
			}
			reject(message)
		}
	})
}

/**
 * Recursively loop through API results using offset
 */
exports.getListAll = function(client, endpoint, payload) {
	counter.get += 1;
	return getListRecursively(client, [], endpoint, payload)
}

async function getListRecursively(client, data, endpoint, payload) {
	if (typeof payload == 'undefined') {
		payload = {}
	}

	const result = await _getList(client, endpoint, payload)
	if (!result) {
		return
	}

	data.push(...result.data)

	if (!(result.data) || result.data.length < LIMIT) {
		return Promise.resolve(data)
	}

	if (!('offset' in payload)) {
		payload.offset = LIMIT
		payload.limit = LIMIT
	}
	else {
		payload.offset += LIMIT
		payload.limit = LIMIT
	}

	return getListRecursively(client, data, endpoint, payload)
}

function _getList(client, endpoint, payload) {

	var url = getURL(client, 'getList', endpoint)

	if (!url) {
		return Promise.reject(new Error('Unknown getList: ' + endpoint))
	}

	var params = getParams(payload)
	var options = { path: url, params: params }
	var headers = getHeaders(client)
	if (headers) {
		options['headers'] = headers
	}

	return _request(options)
}

exports.getList = function(client, endpoint, payload) {
	counter.get += 1;
	return _getList(client, endpoint, payload)
}

exports.get = function(client, endpoint, id, payload) {

	var url = getURL(client, 'get', endpoint, id)

	if (!url) {
		return Promise.reject(new Error('Unknown get ' + endpoint))
	}

	var params = getParams(payload)
	var options = { path: url, params: params }
	var headers = getHeaders(client)
	if (headers) {
		options['headers'] = headers
	}

	counter.get += 1;
	return _request(options)
}

exports.put = function(client, endpoint, id, payload) {

	var url = getURL(client, 'put', endpoint, id)

	if (!url) {
		return Promise.reject(new Error('Unknown put ' + endpoint))
	}

	if (!payload) {
		return Promise.reject('[TM API] No payload for PUT request.')
	}	

	if (Object.keys(payload).length == 0) {
		return Promise.resolve()
	}

	var entity = payload
	var options = { method: 'PUT', path: url, params: {}, entity: entity }
	var headers = getHeaders(client)
	if (headers) {
		options['headers'] = headers
	}

	counter.put += 1;
	return _request(options)
}

var _post = function(client, endpoint, id, payload) {

	var url = getURL(client, 'post', endpoint, id)

	if (!url) {
		return Promise.reject(new Error('Unknown post ' + endpoint))
	}

	var entity = payload
	var options = { method: 'POST', path: url, params: {}, entity: entity }
	var headers = getHeaders(client)
	if (headers) {
		options['headers'] = headers
	}

	return _request(options)
}

exports.post = function(client, endpoint, id, payload) {
	counter.post += 1;
	return _post(client, endpoint, id, payload)
}

exports.del = function(client, endpoint, id, payload) {

	var url = getURL(client, 'delete', endpoint, id)

	if (!url) {
		return Promise.reject(new Error('Unknown delete ' + endpoint))
	}

	var entity = payload
	var options = { method: 'DELETE', path: url, params: {}, entity: entity }
	var headers = getHeaders(client)
	if (headers) {
		options['headers'] = headers
	}

	counter.delete += 1;
	return _request(options)
}

/**
 * Recursively loop through API results using offset
 */
exports.queryAll = function(client, sql) {
	var payload = {
		query: sql,
		limit: QUERY_LIMIT
	}

	counter.query += 1;
	return queryRecursively(client, [], payload)
}

const queryRecursively = async (client, data, payload) => {

	if (typeof payload == 'undefined') {
		payload = {}
	}

	const result = await _query(client, payload)

	if (!result.results) {
		return
	}

	data.push(...result.results)

	if (!(result.results) || result.results.length < QUERY_LIMIT) {
		return Promise.resolve(data)
	}

	if (!('offset' in payload)) {
		payload.offset = QUERY_LIMIT
		payload.limit = QUERY_LIMIT
	}
	else {
		payload.offset += QUERY_LIMIT
		payload.limit = QUERY_LIMIT
	}

	return queryRecursively(client, data, payload)
}

const _query = (client, payload) => _post(client, 'queries', null, payload)

exports.query = async function(client, sql, limit) {
	var payload = {
		limit: limit,
		query: sql
	}

	counter.query += 1;
	const res = await _query(client, payload)
	return res.results
}

async function postWithStream(config) {
	try {
		const response = await axios(config)
		return response
	}
	catch (error) {
		if (error.response) {
			if (error.response.status === 401) {
				throw new Error(`TM API responds with status 'Unauthorized'`)
			}
			throw new Error(`TM API error with status ${error.response.status}`)
		} else if (error.request) {
			throw new Error(`TM API Error: Request was made but no response was received`)
		} else {
			throw new Error(`TM API Error: ${error.message}`)
		}
	}
}

exports.export = async function(client, sql) {
	const url = getURL(client, 'post', 'export')

	const config = {
		method: 'post',
		url,
		responseType: 'stream',
		data: { query: sql }
	}

	const headers = getHeaders(client)
	if (headers) {
		config['headers'] = headers
	}

	const arr = []

	counter.export += 1;

	const response = await postWithStream(config)
	return new Promise((resolve, reject) => {
		response.data.pipe(split(JSON.parse, null, { trailing: false }))
		.on('data', obj => arr.push(obj))
		.on('end', () => resolve(arr))
		.on('error', err => reject(err))
	})
}

exports.saveimage = function(client, id, filepath) {
	return new Promise(async (resolve, reject) => {
		var url = getURL(client, 'post', 'saveimage', id)
		var config = {
			method: 'post',
			url,
			encoding: null,
			data: fs.createReadStream(filepath)
		}

		var headers = getHeaders(client)
		if (headers) {
			config['headers'] = headers
		}

		counter.post += 1;
		try {
			const response = await axios(config)
			resolve(response.data)
		}
		catch (err) {
			reject(err)
		}
	})
}

exports.setDebug = function(input) {
	config.debug = (input) ? true : false
}

exports.setSchema = function(schema) {
	if (!["http", "https"].includes(schema)) {
		console.log("Could not set schema: %s", schema)
		return
	}

	config.schema = schema;
}

exports.setHost = function(host) {
	if (!["apps.ticketmatic.com", "test.ticketmatic.com", "qa.ticketmatic.com", "localhost"].includes(host)) {
		console.log("Could not set host: %s", host)
		return
	}
	if (host === "localhost") {
		config.host = `${host}:9002`
		config.schema = `http`
	}
	else {
		config.host = host
	}
}

// Statistics related functions
exports.getStats = () => R.clone(counter)

var resetStats = function() {
	counter = { get: 0, put: 0, post: 0, delete: 0, query: 0, export: 0 }
}
resetStats() // Initialize the statistics

exports.resetStats = resetStats
