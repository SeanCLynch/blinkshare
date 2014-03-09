var express = require('express');
var server = express();
var AWS = require('aws-sdk');
AWS.config.update({
  accessKeyId: 'AKIAIJY4V42D7ECNAHNA',
  secretAccessKey: '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',
  region: 'us-east-1'
});
var s3 = new AWS.S3();
var fs = require('fs')
var async = require('async');

// Config ================================================================

server.configure( function() {
	server.set('views', __dirname + '/views');
	server.set('view engine', 'ejs');
	server.use(express.static(__dirname + '/views'));
	server.use(express.bodyParser());
	server.use(express.cookieParser());
	server.use(express.session({secret: 'megasecret'}));
});

// FRONT PAGE ================================================================
server.get('/', function(req, res) {
	if (req.session.username != null) {
		var un = req.session.username;

		var usercontent = [];
		// 0 Text
		// 1 Picture
		// 2 Video
		// 3 Link
		// 4 Connection

		async.parallel([
			function(callback1){ // GET TEXT
				s3.getObject({
					Bucket: 'blinkshare1', 
					Key: un+'text'
				}, function(err, data) { // handle whatever is returned
					if (err) { 	
						callback1(err, null); 							
					} else { // don't need to callback, have outside scope object
						usercontent[0] = data.Body.toString("utf-8");
						callback1(null, "success");
					} 
				});
			},
			function(callback2) { // GET PICTURE
				s3.getObject({
					Bucket:'blinkshare1',
					Key: un+'image'
				}, function(err, data) {
					if (err) {
						callback2(err, null); 
					} else { 
						usercontent[1] = "data:image/jpeg;base64,"+data.Body.toString('base64');
						callback2(null, "success");
					}
				});
			}, 
			function(callback3) {
				s3.getObject({
					Bucket:'blinkshare1',
					Key: un+'link'
				}, function(err, data) {
					if (err) { 
						callback3(err, null);
					} else {
						usercontent[3] = data.Body.toString('utf-8');
						callback3(null, "success");
					}
				});
			}
			],
			function(err, results) {
				if (err) { // if there is an error loading the page
					console.log(err);
					res.redirect('/getin.html');
				} else // render the page with object usercontent (or split it up now?)
					console.log("User loaded.");
					res.render('index', {user: req.session.username, 
											text: usercontent[0], 
											image: usercontent[1],
											link: usercontent[3] 
					});
		});
	} else { // If the user isn't signed in
		res.render('index', {user: null, text: null});
	}
});

server.post('/', function(req, res) {
	console.log("BODY?"+req.body);
	if (req.body.text) {
		var fileName = req.session.username + "text";
		s3.putObject({
			Body: req.body.text,
			Bucket: 'blinkshare1',
			Key: fileName
		}, function(err, data) {
			if (err) {
				console.log("Error: "+err);
			} else {
				res.redirect('/');
			}
		});
	} else if (req.body.link) {
		// check that link is a link
		var fileName = req.session.username + "link";
		s3.putObject({
			Body: req.body.link,
			Bucket: 'blinkshare1',
			Key: fileName
		}, function(err, data) {
			if (err) {
				console.log("Error: "+err);
			} else {
				res.redirect('/');
			}
		});
	} else if (req.files.image) {
		var fileStream = fs.createReadStream(req.files.image.path);
		var fileName = req.session.username + "image";
		s3.putObject({
			Body: fileStream, 
			Bucket: 'blinkshare1',
			Key: fileName,
			ContentType: 'image/jpeg',
			ACL: 'public-read'
		}, function(err, data) {
			if (err) {
				console.log("Error "+err);
			}
			console.log(req.files.image.name +" "+req.files.image.path);
			res.redirect('/');
		});
	}
});

server.get('/getout.html', function(req, res) {
	req.session.username = null;
	res.redirect('/');
});

// Login / Signup
server.get('/getin.html', function(req, res) {
	res.send('getin.html');
});

server.post('/getin.html', function(req, res) {
	if (req.body.getin == "Login") {
		s3.getObject({
			Bucket: 'blinkshare1',
			Key: req.body.username
		}, function(err, data) {
			if (err) { 
				console.log("Error: "+err);
				res.redirect('/getin.html');
			} else {
				console.log(data.Body);
				if (data.Body == req.body.password) {
					req.session.username = req.body.username;
					res.redirect('/');		
				} else {
					res.redirect('/getin.html');
				}
			}
		});
	} else if (req.body.getin == "Signup") {
		s3.putObject({
			Body: req.body.password,
			Bucket: 'blinkshare1',
			Key: req.body.username
			// Might want to add security here
		}, function(err, data) {
			if (err) {
				console.log("Error: "+err);
			} else {
				req.session.username = req.body.username;
				res.redirect('/');
			}
		})
	}

});

	
// Start her up! ================================================================
server.listen(8080);