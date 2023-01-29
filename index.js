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
        const userPass = req.body.userPass;
        const encryptedPass = jwt.sign(userPass,process.env.JWT_TOKEN);
        req.encryptPass = encryptedPass;
        next();
    };

    const encryptedUserInfo = (email,pass) => {
        const encryptedInfo = jwt.sign({userEmail:email,userPass:pass},process.env.JWT_TOKEN);
        return encryptedInfo;
    };

    const decryptPass = (encryptStr) => {
        jwt.verify(encryptStr,process.env.JWT_TOKEN,(err,decode)=>{
            if(err) return 'errrrrrrror';
            encryptStr = decode;
        });
        return encryptStr;
    };

    try{
        const OPB = client.db(`online-payment-bills`);
        const billList = OPB.collection('BillList');
        const userInfo = OPB.collection('UsersInfo');

        app.get(`/`,(req,res)=>{
            return res.send('Welcome Online-Payment-Bills APIs')
        });

        app.get('/billing-list',async (req,res)=>{
            const reseult = await billList.find({}).toArray();
            return reseult;
        });

        app.post('/login',encryptPass,async (req,res)=>{
            const {userEmail,userPass} = req.body;
            const findUser = await userInfo.estimatedDocumentCount({userEmail: userEmail}) > 0;
            if(findUser) {
                const getUserInfo = await userInfo.findOne({userEmail: userEmail});
                const decode = decryptPass(getUserInfo.userPass);
                if(decode === userPass) {
                    const encodedUserInfo = encryptedUserInfo(userEmail,userPass);
                    res.send({acknowledge: true,encodedUserInfo});
                }
            }
        });

        app.post('/registration',encryptPass,async (req,res)=>{
            const {userEmail,userFullName} = req.body;
            const userData = {userEmail,userFullName,userPass: req.encryptPass};
            const result = await userInfo.insertOne(userData);
            return res.send(result);

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