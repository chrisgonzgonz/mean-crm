// call packages
var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');
var port        = process.env.PORT || 8080;
var User        = require('./app/models/user');
var jwt         = require('jsonwebtoken');
var superSecret = 'sandiegosuperchargers';


// db setup
mongoose.connect('mongodb://localhost:27017/myDatabase');

// app config
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// configure app to handle CORS requests
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
  next();
});

// log all requests to the console
app.use(morgan('dev'));

// ROUTES

app.get('/', function(req, res) {
  res.send('Welcome to the home page!');
});

// get an instance of the express router
var apiRouter = express.Router();

// route for authenticating users
apiRouter.post('/authenticate', function (req, res) {
//    find the user, select the name username and password explicitly
    User.findOne({
        username: req.body.username
    }).select('name username password').exec(function (err, user) {
        if (err) throw err;

        //    no user with that username was found
        if (!user) {
            res.json({
                success: false,
                message: 'Authentication failed. User not found.'
            });
        } else if (user) {
            // check if password matches
            var validPassword = user.comparePassword(req.body.password);
            if (!validPassword) {
                res.json({
                    success: false,
                    message: 'Authentication failed. Wrong password.'
                });
            } else {
                //    if user is found and password is right
                //    create token
                var token = jwt.sign({
                    name: user.name,
                    username: user.username
                }, superSecret, {
                    expiresInMinutes: 1440 // expires in 24 hrs
                });

                // return the information including token as JSON
                res.json({
                    success: true,
                    message: 'Enjoy your token!',
                    token: token
                });
            }
        }
    });
});

// middleware to use for all requests
apiRouter.use(function (req, res, next) {
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.param('token') || req.headers['x-access-token'];
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, superSecret, function (err, decoded) {
            if (err) {
                return res.status(403).send({
                    success: false,
                    message: 'Failed to authenticate token.'
                });
            } else {
                // if everything is good, save to request for use in other routes
                req.decoded = decoded;
                next();
            }
        })
    } else {
        // if there is no token, return an HTTP response of 403 (access forbidden) and an error message
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });
    }
    //logging
    //console.log('Somebody just came to our app');
    //next();
});

// Routes
apiRouter.get('/', function(req, res) {
  res.json({message: 'hooray! welcome to our api!'});
});

// more routes
apiRouter.route('/users')
    // create a user
    .post(function(req, res) {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;
        user.save(function(err) {
            if (err) {
                if (err.code == 11000) {
                    return res.json({success: false, message: 'A user with that username alread exists. '});
                }
                else {
                    return res.send(err);
                }
            }
            res.json({ message: 'User created!' });
        });
    })

    .get(function (req, res) {
        User.find(function (err, users) {
            if (err) res.send(err);

            //    return the users
            res.json(users);
        })
    });

apiRouter.route('/users/:user_id')
//get the user with that id
    .get(function (req, res) {
        User.findById(req.params.user_id, function (err, user) {
            if (err) res.send(err);

            res.json(user);
        });
    })

    .put(function (req, res) {
        User.findById(req.params.user_id, function (err, user) {
            if (err) res.send(err);

            //update the user's info only if it's new
            if (req.body.name) user.name = req.body.name;
            if (req.body.username) user.username = req.body.username;
            if (req.body.password) user.password = req.body.password;

            user.save(function (err) {
                if (err) res.send(err);

                res.json({ message: 'User updated!' });
            });
        });
    })

    .delete(function (req, res) {
        User.remove({
            _id: req.params.user_id
        }, function (err, user) {
            if (err) return res.send(err);

            res.json({ message: 'Succesfully deleted' });
        });
    });

apiRouter.get('/me', function (req, res) {
    res.send(req.decoded);
})


app.use('/api', apiRouter);

// start the server
app.listen(port);
console.log('Magic happens on port ' + port);
