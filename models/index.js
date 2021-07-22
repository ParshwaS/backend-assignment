const mongoose = require('mongoose');

const url = `mongodb+srv://admin:admin@cluster0.ysv87.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

mongoose.connect(url, {useNewUrlParser:true, useUnifiedTopology:true, useFindAndModify: false, useCreateIndex: true }, (err)=>{
    if(!err){
        console.log("Database connected successfully...");
    }else{
        console.log("Error in connecting to database...");
        console.log(JSON.stringify(err));
    }
});

require('./invoive.model');