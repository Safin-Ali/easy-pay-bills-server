const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 5000;
const {MongoClient} = require('mongodb');
const jwt = require('jsonwebtoken');

// middleware
app.use(cors());
app.use(express.json());

// connect mongoDB
const uri = `mongodb+srv://${process.env.mongoDBUser}:${process.env.mongoDBPass}@cluster01.rhyj5nw.mongodb.net/test`;
const client = new MongoClient(uri);

async function main () {

    const encryptPass = (req,res,next) => {
        const userPass = req.headers;
        const encryptedPass = jwt.sign(userPass,process.env.JWT_TOKEN);
        console.log('key',encryptedPass)
        next();
    };

    // const decryptPass = (encode) => {
    //     const encryptedPass = jwt.verify(userPass,process.env.JWT_TOKEN);
    //     next();
    // };



    try{
        const OPB = client.db(`online-payment-bills`);
        const billList = OPB.collection('BillList');

        app.get(`/`,(req,res)=>{
            return res.send('Welcome Online-Payment-Bills APIs')
        });

        app.get('/billing-list',async (req,res)=>{
            const reseult = await billList.find({}).toArray();
            return reseult;
        });

        app.get('/login',encryptPass,async (req,res)=>{
            const {userEmail} = req.headers;
            const filter = {userEmail}
        });
    }
    catch(e){
        console.log(e.message)
    }
};


main(); // call databage

app.listen(port,()=>{
    console.log('this api run in '+port)
})