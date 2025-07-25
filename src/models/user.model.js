import mongoose ,{Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrpt from "bcrypt"

const userSchema=new Schema({
    username:{
        type:String,
        required:true,
        lowercase:true,
        unique:true,
        trim:true,
        index:true
    },
    email:{
        type:String,
        required:true,
        lowercase:true,
        unique:true,
        trim:true
    },
    fullName:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    avatar:{
        type:String,//cloudinary url
        required:true
    },
    coverImage:{
        type:String
    },
    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:"Video"
        }
    ],
    password:{
        type:String,
        required:[true,'Password is required']
    },
    refreshToken:{
        type:String
    }
},{timestamps:true})
//timestamps is for : createdAt & updatedAt

//to encrypt the password using bcrypt
userSchema.pre("save",async function(next){

    //checking if password is changed or not if not then next() means go to next middleware
    if(!this.isModified("password")) return next();

    //if changed then encrypt it using hash
    this.password=await bcrpt.hash(this.password,10)
    next()
})

//now if we directly compare the password that we input to the db then ofc it will be different 
//bcz password in db is encrypt so now how can we compare pass and do operations like login
//to solve this we will again use bcrypt bcz it is one who know the real & encrypted pass
//so using compare keyword
userSchema.methods.isPasswordCorrect=async function (password) {
   return await bcrpt.compare(password,this.password)
}


//access token is short lived & refresh token is long lived
userSchema.methods.generateAccessToken=function(){
    return jwt.sign({
        _id:this.id,
        email:this.email,
        username:this.username,
        fullName:this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
)
}

//code is same for both but serves different purpose
userSchema.methods.generateReferenceToken=function(){
    return jwt.sign({
        _id:this.id,
        email:this.email,
        username:this.username,
        fullName:this.fullName
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }
)
}

export const User=mongoose.model("User",userSchema)
