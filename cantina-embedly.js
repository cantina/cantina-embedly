var app = require('cantina')
  , request = require('request')
  , _ = require('underscore');

app.embedly = module.exports = {
  fetch: fetch
};

// Default conf.
app.conf.add({
  embedly: {
    url: 'http://api.embed.ly/1/oembed'
  }
});

// Grab embedly conf.
var conf = app.conf.get('embedly');
var options = {
  uri: conf.url,
  qs: {
    key: conf.key
  }
};
_.defaults(options.qs, conf.options);

function fetch (url, callback) {
  options.qs.url = rewrite(url);

  request(options, function (error, response, body) {
    if (error) return callback(error);
    if (response.statusCode !== 200) return callback(new Error('EMBEDLY_HTTP_ERROR: ' + response.statusCode));
    if (!body) return callback(new Error('EMBEDLY_NO_BODY'));
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
        Object.keys(body).forEach(function (key) {
          if(body[key] && typeof body[key] === 'string'){
            if (['meta', 'oembed', 'open_graph', 'place'].indexOf(key) >= 0) {
              body[key] = JSON.parse(body[key]);
            }
          }
        });
      } catch (e) {
        return callback(e);
      }
    }
    body.thumbnail_html = getThumbnailHtml(body);
    return callback(null, body);
  });
}

function rewrite (url) {
  // CNN's RSS feeds are powered by FeedBurner
  // This obfuscates the "real" url with a crap redirect link that Embedly can't
  // do anything with. But the RSS feed also contains the original url, and
  // smart sharing tools will use that url. This is better, but even that
  // "real" url is not the canonical url, Embedly still can't do anything useful
  // with it. Luckily, *we* know CNN's real-url-munging algorithm, so at least
  // if we get that "real" url, we can rewrite it into the canonical url, which
  // Embedly CAN deal with.
  //
  // WOOT!!!!
  if (url.match(/cnn.com/) && url.match(/\/video\//)) {
    return url.replace('#', 'data/2.0') + '.html';
  }
  return url;
}

/**
 * Parse Embed.ly JSON depending on the "type" of link and
 * return a basic formatted HTML string with the appropriate
 * thumbnail image or video embed
 *
 * @param {Object}
 * @return {String}
 */
function getThumbnailHtml (data) {
  var output = '';
  switch(data.type) {
  case 'link':
    if (data.thumbnail_url) {
      output = '<img src="' + data.thumbnail_url + '"';
      if (data.thumbnail_width) {
        output += ' width="' + data.thumbnail_width + '"';
      }
      if (data.thumbnail_height) {
        output += ' height="' + data.thumbnail_height + '"';
      }
      output += '/>';
    }
    break;
  case 'photo':
    // According to the Embed.ly docs,
    // for the 'photo' type, there will **always** be url, width and height
    output = '<img src="' + data.url + '" width="' + data.width + '" height="' + data.height + '"/>';
    break;
  case 'rich':
  case 'video':
    output = data.html;
    break;
  }
  return output;
}
