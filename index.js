const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 5000;
const {MongoClient, ObjectId} = require('mongodb');
const jwt = require('jsonwebtoken');

// middleware
app.use(cors());
app.use(express.json());

const encryptPass = (basePassStr) => {
    return jwt.sign(basePassStr,process.env.JWT_TOKEN);
};
const encryptedUserInfo = (email,pass) => {
    const encryptedInfo = jwt.sign({userEmail:email,userPass:pass},process.env.JWT_TOKEN);
    return encryptedInfo;
};
const decryptedUserInfo = (encryptedStr) => {
    return jwt.verify(encryptedStr,process.env.JWT_TOKEN,(err,decode)=>{
        if(err) return 'errrrrrrror';
        return decode;
    });
};
const decryptPass = (encryptStr) => {
    jwt.verify(encryptStr,process.env.JWT_TOKEN,(err,decode)=>{
        if(err) return 'errrrrrrror';
        encryptStr = decode;
    });
    return encryptStr;
};

// connect mongoDB
const uri = `mongodb+srv://${process.env.mongoDBUser}:${process.env.mongoDBPass}@cluster01.rhyj5nw.mongodb.net/test`;
const client = new MongoClient(uri);

async function main () {

    try{
        const OPB = client.db(`online-payment-bills`);
        const billList = OPB.collection('BillList');
        const userInfo = OPB.collection('UsersInfo');

        app.get(`/`,(req,res)=>{
            return res.send('Welcome Online-Payment-Bills APIs')
        });

        app.get('/billing-list',async (req,res)=>{
            const countNum = req.query.count;
            const resultLength = await billList.countDocuments({});
            if(!resultLength) return res.send({count:0,data:[],totalPay:0});

            const sumOfBilsPay = await billList.find({}).toArray();

            const result = await billList.find({}).skip(parseInt(countNum)).limit(10).sort({billDate: -1}).toArray();

            const withOutDateObj = result.map(({billDate,...rest}) => rest);

            if(sumOfBilsPay && sumOfBilsPay.length === 1) {
                return res.send({count:resultLength,data:withOutDateObj,totalPay:sumOfBilsPay[0].amount});
            };

            return res.send({count:resultLength,data:withOutDateObj,totalPay:null});
        });

        app.post('/add-billing',async (req,res)=>{
            const data = req.body;
            const reseult = await billList.insertOne({...data,billDate: new Date()});
            return res.send(reseult);
        });

        app.patch('/update-billing/:id',async (req,res)=>{
            const id = req.params.id;
            const data = req.body;
            const filter = {_id: ObjectId(id)};
            const reseult = await billList.replaceOne(filter,data);
            return res.send(reseult);
        });

        app.delete('/delete-billing/:id',async (req,res)=>{
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const reseult = await billList.deleteOne(filter);
            return res.send(reseult);
        });

        app.post('/login',async (req,res)=>{
            const {userEmail,userPass} = req.body;
            console.log(req.body);
            const findUser = await userInfo.countDocuments({userEmail: userEmail}) > 0;
            if(findUser) {
                const getUserInfo = await userInfo.findOne({userEmail: userEmail});
                const decryptedPass = decryptPass(getUserInfo.userPass);

                if(decryptedPass === userPass) {
                    const encodedUserInfo = encryptedUserInfo(userEmail,userPass);
                    return res.send({acknowledge: true,encodedUserInfo});
                }
                return res.status(401).send({acknowledge: false,message:'Wrong Password'})
            };

            return res.status(401).send({acknowledge: false,message:'Account Not Found. Please Signup'})
        });

        app.get('/checkUser',async (req,res)=>{
            const encryptedInfo = req.headers.secretkey;
            const decryptedInfo =decryptedUserInfo(encryptedInfo);
            if(decryptedInfo) {
                const encryptedPass = encryptPass(decryptedInfo.userPass);
                const filter  = {userEmail:decryptedInfo.userEmail,userPass: encryptedPass};
                const result = await userInfo.findOne(filter);
                if(result) {
                    return res.send({acknowledge: true});
                }
                return res.send({acknowledge: false});
            }
        });

        app.post('/registration',async (req,res)=>{
            const {userEmail,userFullName,userPass} = req.body;
            const checkExist = await userInfo.countDocuments({userEmail: userEmail}) > 0;
            if(checkExist) return res.status(403).send({message: 'Already have an account. Please SignIn'})
            const encryptedPass = encryptPass(userPass);
            const userData = {userEmail,userFullName,userPass: encryptedPass};
            const result = await userInfo.insertOne(userData);
            return res.send(result);

        });

        app.get(`/serachKeyword`, async (req,res)=>{
            const key = req.query.keywords.toLowerCase();
            const allBillsData = await billList.find({}).toArray();
            const filtered = allBillsData.filter(matchedKey => {
                return matchedKey.fullName.toLowerCase().includes(key) || matchedKey.email.toLowerCase().includes(key) || matchedKey.phoneNum.toLowerCase().includes(key)
            });
            const withOutDateObj = filtered.map(({billDate,...rest}) => rest);
            res.send(withOutDateObj);
        })
    }
    catch(e){
        console.log(e.message)
    }
};


main(); // call databage

app.listen(port,()=>{
    console.log('this api run in '+port)
})