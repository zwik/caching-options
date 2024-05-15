/* eslint-disable no-console */
const express = require('express');
const sqlite3 = require('sqlite3');
const mcache = require('memory-cache');
const Memcached = require('memcached');
const redis = require('redis');
const flatCache = require('flat-cache');
const path = require('path');

const PORT = process.env.PORT || 3003;

const memCache = new mcache.Cache();
// eslint-disable-next-line no-unused-vars
const cacheMiddleware = (duration) => (req, res, next) => {
  const key = `__express__${req.originalUrl || req.url}`;
  const cacheContext = memCache.get(key);
  if (cacheContext) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(cacheContext);
    return;
  }

  res.sendResponse = res.send;
  res.send = (body) => {
    memCache.put(key, body, duration * 1000);
    res.sendResponse(body);
  };
  next();
};

const memcached = new Memcached('127.0.0.1:11211');
// eslint-disable-next-line no-unused-vars
const memcachedMiddledware = (duration) => (req, res, next) => {
  const key = `__express__${req.originalUrl || req.url}`;
  memcached.get(key, (err, data) => {
    if (data) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.send(data);
      return;
    }

    res.sendResponse = res.send;
    res.send = (body) => {
      memcached.set(key, body, duration * 60, (error) => {
        console.error(error);
      });
      res.sendResponse(body);
    };
    next();
  });
};

// The redis client also accepts a valkey server currently
const client = redis.createClient();
(async () => {
  await client.connect();
})();
// eslint-disable-next-line no-unused-vars
const redisMiddleware = async (req, res, next) => {
  const key = `__express__${req.originalUrl || req.url}`;
  const reply = await client.get(key);
  if (reply) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(JSON.parse(reply));
    return;
  }
  res.sendResponse = res.send;
  res.send = async (body) => {
    await client.set(key, JSON.stringify(body));
    res.sendResponse(body);
  };
  next();
};

const cache = flatCache.load('productsCache', path.resolve('./cache'));
// eslint-disable-next-line no-unused-vars
const flatCacheMiddleware = (req, res, next) => {
  const key = `__express__${req.originalUrl || req.url}`;
  const cacheContent = cache.getKey(key);
  if (cacheContent) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(cacheContent);
    return;
  }

  res.sendResponse = res.send;
  res.send = (body) => {
    cache.setKey(key, body);
    cache.save();
    res.sendResponse(body);
  };
  next();
};

const app = express();

// cacheMiddleware(duration)
// memcachedMiddledware(duration)
// redisMiddleware
// flatCacheMiddleware
app.get('/products', redisMiddleware, (req, res) => {
  setTimeout(() => {
    const db = new sqlite3.Database('./Products.db');
    const sql = 'SELECT * FROM products';

    db.all(sql, [], (err, rows) => {
      if (err) {
        throw err;
      }
      db.close();
      res.send(rows);
    });
  }, 3000);
});

app.listen(PORT, () => {
  console.log(`App running on ${PORT}`);
});
