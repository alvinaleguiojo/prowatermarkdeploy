const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');
const express = require('express');
const path = require('path');
const stripe = require('stripe')('sk_test_51IubKUER3FhkAsU8RjO33hFxXgVmuNl5qYKGyEyCw7HHApOBy6u5d9EYwGKVGP3TeQ5QW1zX0kDIVaBIR68y8a4z00IlTzRtid'); // Add your Secret Key Here
const app = express();
const jwt = require('jsonwebtoken');
const Article = require('./models/article')
const articleRouter = require('./routes/articles')
const methodOverride = require('method-override')



// This will make our form data much more useful
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('views'))
app.use(methodOverride('_method'))
// This will set express to render our views folder, then to render the files as normal html
app.set('view engine', 'ejs');
//app.engine('html', require('ejs').renderFile);
//app.use(express.static(path.join(__dirname, './views')));

var mysqlConnection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'login_sys'
})

mysqlConnection.connect((err) => {
 if(!err){
   console.log("DB connection succeeded");
 }else {
   console.log("DB connection failed" + JSON.stringify(err, undefined, 2));
 }
})

module.exports = mysqlConnection;


app.use(session({
  secret: 'ABCDefg',
  resave: false,
  saveUninitialized : true 
}))

app.post('/charge', function(req, res){
  const fullname = req.body.fullname;
  const email = req.body.email;
  const password = req.body.password;
  const cpassword = req.body.cpassword;

  
  if(cpassword === password) {
   const sql = 'select * from user where email = ?;';
    
   mysqlConnection.query(sql, [email], function(err, result, fields) {
     if(err) throw err;

     if(result.length > 0) {
       res.redirect('/');
     } else {
        var hashpassword = bcrypt.hashSync(password, 10);
        var sql = 'insert into user (fullname, email, password) values(?, ?, ?);';

        mysqlConnection.query(sql, [fullname, email, hashpassword], function(err, result, fields) {
          if(err) throw err;
          res.redirect('login');
        })
     }
   })
}else {   
        res.redirect('/');
} 


})

app.post("/charge", (req, res) => {
 const price = 9;
   try {
     stripe.customers
       .create({
         // fullname: req.body.name,
         // email: req.body.email,
         // password: req.body.password,
         // cpassword: req.body.cpassword,
         source: req.body.stripeToken   
       })
       .then(customer =>
         stripe.charges.create({
          amount: price,
           currency: "usd",
           customer: customer.id 
         })
       )
       .then(() => res.render("completed"))
       .catch(err => console.log(err));
   } catch (err) {
     res.send(err);
   }
 });

// handle post request for user login 
app.post('/auth_login', function(req, res, next) {
 const email = req.body.email;
 const password = req.body.password;

 const sql = 'select * from user where email = ?;';

 mysqlConnection.query(sql, [email], function(err, result, fields ){
     if(err) throw err;

    if(result.length &&  bcrypt.compareSync(password, result[0].password)) {
       req.session.loggedin = true;
       req.session.email = email;  
       res.redirect('/profile');
    }
    else {
      res.render('login')
    }
 });

});

// request password reset
let user = {
  id: "fsdfdsf4efds",
  email: "alvin.aleguiojo@gmail.com",
  password: "sadasjhdja"
}

const JWT_SECTRET = 'some super secret...'

app.get('/forgot-password', (req, res) =>{
   res.render('forgot-password');
})

app.post('/forgot-password', (req, res) =>{
   const {email} = req.body;

  //make user exist in database
  
   if(email !== user.email){
     res.send('User is not registered!');
     return;
   }

   // user exist then create one-time link for 15 minutes validity
   const secret = JWT_SECTRET + user.password;
   const payload = {
     email: user.email,
     id: user.id
   }

   const token  = jwt.sign(payload, secret, {expiresIn: '5m'})
   const link = `http://localhost:3001/reset-password/${user.id}/${token}`
   console.log(link);
   res.send('Password link has been sent to your email address...')

})

app.get('/reset-password/:id/:token', (req, res) =>{
    const {id, token} = req.params;
    
    // check id this id exist in database 
    if(id !== user.id){
      res.send('invalid ID...')
      return;
    }
    // valid user id 
    const secret = JWT_SECTRET + user.password;
    try {
      const payload = jwt.verify(token, secret)
      res.render('reset-password', {email: user.email})

    }catch(error) {
     console.log(error.message);
     res.send(error.message);
    }
})

app.post('/reset-password/:id/:token', (req, res) =>{
     const {id, token} = req.params;
     const {password, password2} = req.body;
     
     if(id !== user.id){
      res.send('invalid ID...')
      return;
    }

    const secret = JWT_SECTRET + user.password;
    try{
      const payload = jwt.verify(token, secret)
      //old password and new password match
      // we can find the user with the payload email and id then update new password
      //always hash the password before save into database
      user.password =password
      res.send(user)
    }catch(e){
      console.log(error.message)
      res.send(error.message);
    }
})



app.get('/profile', function(req, res, next){    
 if(req.session.loggedin){
   res.render('profile');  
 } else {
    res.redirect('/');
 }
  res.end();
         
})

app.get('/logout', function(req, res, next) {
 if(req.session.email) {
   req.session.destroy(); 
 }
    res.redirect('login');
})


//Routes
app.get('/home', (req, res) => {
 res.render('index');
});

app.get('', (req, res) => {
    if(req.session.email) {
        res.render('profile');
    } else {
        res.render('index');
    }
   });

   app.get('/profile', (req, res) => {
    if(req.session.cookie) {
        res.render('profile');
    } else {
        res.render('login');
    }
   });

app.get('/login', (req, res) => {
    res.render('login')
})

app.get('/watermarkfreeversion', (req, res) => {
    res.render('watermarkfreeversion')
})

app.get('/signup', (req, res) => {
    res.render('signup')
})

app.get('/watermarkpro', (req, res) => {
    res.render('watermarkpro')
})

app.get('/rich_text_editor', (req, res) => {
  res.render('rich_text_editor')
})

app.get('*', (req, res) => {
    res.render('index')
})


app.get('/', async (req, res) => {
  const articles = await Article.find().sort({ createdAt: 'desc' })
  res.render('articles/index', { articles: articles })
})

app.use('/articles', articleRouter)

const port = process.env.PORT || 3001;
app.listen(port, () => console.log('Server is running...'));