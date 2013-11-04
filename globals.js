exports.PORT = process.env.PORT || 80;
exports.APP_URL = process.env.URL || "http://localhost";

exports.FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || require('./keys').FACEBOOK_APP_ID;
exports.FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || require('./keys').FACEBOOK_APP_SECRET;
exports.SESSION_TOKEN = process.env.SESSION_TOKEN || require('./keys').SESSION_TOKEN;