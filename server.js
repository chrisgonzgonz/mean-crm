// call packages
var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');
var port        = process.env.PORT || 8080;
var User        = require('./app/models/user');


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

// middleware to use for all requests
apiRouter.use(function (req, res, next) {
    //logging
    console.log('Somebody just came to our app');
    next();
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


app.use('/api', apiRouter);

// start the server
app.listen(port);
console.log('Magic happens on port ' + port);
