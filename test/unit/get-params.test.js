'use strict'

const assert = require('assert')
const config = require('../../tm3_api.json')

function listContains(val, list) {
	return list.indexOf(val) !== -1
}

function getParams(payload) {
	if (typeof payload === 'undefined') {
		return {}
	}

	var params = {}

	for (var key in payload) {
		if (!listContains(key, config.params_optional)) {
			continue
		}
		params[key] = payload[key]
	}

	return params
}

const payload = {
	filter: 'SELECT 1',
	limit: 100,
	output: 'withlookup',
	unknown: 'skip-me',
}

const params = getParams(payload)

assert.strictEqual(params.filter, payload.filter)
assert.strictEqual(params.limit, payload.limit)
assert.strictEqual(params.output, payload.output)
assert.strictEqual('unknown' in params, false)

assert.strictEqual(listContains('filter', config.params_optional), true)
assert.strictEqual(listContains('orders', config.no_extra_param), false)
assert.strictEqual(listContains('accounts', config.no_extra_param), true)
assert.strictEqual(listContains('get', ['getList', 'get', 'post']), true)

console.log('get-params.test.js: ok')
