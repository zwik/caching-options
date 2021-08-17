Small test project to test various caching options.

The idea is to simulate a long query, I do this by doing an actual query and give the results back from within a `setTimeout`. The next requests should then be a lot faster because they're cached. You can verify this in the browser or in Postman.

A small SQLite3 database is provided.

I've included a `docker-compose.yml` file to start a Memcached and Redis server. You can start these by typing `docker-compose up` in your terminal.

The following options can be tested with this application:
- memory-cache
- Memcached
- Redis
- flat-cache