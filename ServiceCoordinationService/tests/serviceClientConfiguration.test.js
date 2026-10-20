import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { getRequestQuotationById } from '../src/clients/seekerServiceClient.js';
import { getProviderQuotationById } from '../src/clients/providerServiceClient.js';

test('clients use runtime environment overrides loaded after module initialization', async () => {
  const names = ['SEEKER_SERVICE_URL', 'SEEKER_SERVICE_BASE_URL', 'PROVIDER_SERVICE_URL', 'PROVIDER_SERVICE_BASE_URL'];
  const original = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const get = axios.get; const urls = [];
  axios.get = async url => { urls.push(url); return { data: { data: { _id: 'test' } } }; };
  try {
    delete process.env.SEEKER_SERVICE_URL;
    process.env.SEEKER_SERVICE_BASE_URL = 'http://127.0.0.1:6001/';
    process.env.PROVIDER_SERVICE_BASE_URL = 'http://127.0.0.1:3002/';
    await getRequestQuotationById('request');
    await getProviderQuotationById('quotation');
    assert.equal(urls[0], 'http://127.0.0.1:6001/request-quotations/request');
    assert.equal(urls[1], 'http://127.0.0.1:3002/api/provider/quotations/quotation');
    process.env.SEEKER_SERVICE_URL = 'https://seeker.example/';
    process.env.PROVIDER_SERVICE_BASE_URL = 'https://provider.example/';
    await getRequestQuotationById('next');
    await getProviderQuotationById('next');
    assert.equal(urls[2], 'https://seeker.example/request-quotations/next');
    assert.equal(urls[3], 'https://provider.example/api/provider/quotations/next');
  } finally {
    axios.get = get;
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name];
    }
  }
});
