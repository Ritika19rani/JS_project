import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB=async ()=>{
    try {
       const connectionInstance=await mongoose.connect(`${process.env.MONOGODB_URI}/${DB_NAME}`) 
       console.log(`\n MongoDB connected !! DB Host:${connectionInstance.connection.host}`);
       
    } catch (error) {
        console.log("MONGODB connection error",error);
        process.exit(1) //It is a command in Node.js 
                        //that forcibly stops the program and tells the operating system that the process exited with an error.
                       //0 means success & 1 means error
    }
}

export default connectDB
