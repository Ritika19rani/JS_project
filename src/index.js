import dotenv from "dotenv";
import connectDB from "../src/db/index.js";
import {app} from "./app.js"

dotenv.config({
    path:'./.env'
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server is running on ${process.env.PORT}`);
    })
    app.on("error",(error)=>{
        console.log("ERROR",error);
        throw error;
    })
})
.catch((err)=>{
    console.log("MongoDB connection failed!!!!",err);
})
