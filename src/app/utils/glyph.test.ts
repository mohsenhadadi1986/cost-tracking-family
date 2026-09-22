import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { categoryIconKey, placeIconKey, tabIconKey } from './glyph';

describe('glyph keys', () => {
  it('maps places to brand logos', () => {
    assert.equal(placeIconKey('Revolut'), 'revolut');
    assert.equal(placeIconKey('ING Current Account'), 'ing');
    assert.equal(placeIconKey('ING Credit Account'), 'ing');
    assert.equal(placeIconKey('Post Bank'), 'post');
    assert.equal(placeIconKey('Satispay'), 'satispay');
    assert.equal(placeIconKey('PayPal'), 'paypal');
    assert.equal(placeIconKey('Credit Card'), 'card');
    assert.equal(placeIconKey('Ban ING'), 'ing');
    assert.equal(placeIconKey('Wise'), 'wallet');
  });

  it('maps categories and tabs to icons', () => {
    assert.equal(categoryIconKey('Medical'), 'heart');
    assert.equal(categoryIconKey('Sport'), 'sport');
    assert.equal(categoryIconKey('Education'), 'book');
    assert.equal(categoryIconKey('Electricity'), 'zap');
    assert.equal(categoryIconKey('Internet Home'), 'wifi');
    assert.equal(placeIconKey('Add place'), 'plus');
    assert.equal(categoryIconKey('Add category'), 'plus');
    assert.equal(categoryIconKey('Add plan'), 'plus');
    assert.equal(categoryIconKey('Lend Mohammad'), 'users');
    assert.equal(categoryIconKey('Transfer'), 'swap');
    assert.equal(tabIconKey('Insert Data'), 'plus');
    assert.equal(tabIconKey('Visualization'), 'layout');
    assert.equal(tabIconKey('Charts'), 'chart');
    assert.equal(tabIconKey('Settings'), 'settings');
  });
});
