// import { asyncHandler } from "../utils/asyncHandler.js";
// import {ApiError} from "../utils/ApiError.js"
// import {User} from "../models/user.model.js"
// import {uploadOnCloudinary} from "../utils/cloudinary.js"
// import { ApiResponse } from "../utils/ApiResponse.js";

// const registerUser=asyncHandler(async(req,res)=>{

//     //get user details from frontened
//     //all are filled or not
//     //check if user already exist or not->username/email
//     //check for img/avatar
//     //upload them to cloudinary,avatar(frontened->through multer->my system->cloudinary)
//     //create user ob->create entry in db
//     //remove password & refresh token from res
//     //return res

//     //get user details from frontened
//     const {username,fullName,email,password} =req.body
//     // console.log("email",email);
     
//     //can write this but using more optimized code because using this below code we have to write it for all(fullName,username,email....etc) and that will make our code boring
//     // if(fullName===""){
//     //     throw new ApiError(400,"Full Name is required")
//     // }

//     //optimized one(all are filled or not)
//     if (
//         [fullName,email,username,password].some((field)=>field?.trim() === "")
//     ) {
//         throw new ApiError(400,"All fields are required")
//     }

//     //check if user already or not
//     const existedUser = await User.findOne({
//         $or:[{username},{email}]
//     })
//     if(existedUser){
//         throw new ApiError(409,"username or email already exists")
//     }
//     //console.log(req.files) <- to do

//     //check for img/avatar
//     const avatarLocalPath = req.files?.avatar[0]?.path;
//     // const coverImageLocalPath=req.files?.coverImage[0]?.path;

//     let coverImageLocalPath;
//     if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0) {
//         coverImageLocalPath = req.files.coverImage[0].path
//     }

//     if(!avatarLocalPath){
//         throw new ApiError(400,"Avatar file is required")
//     }

//     //upload to cloudinary
//     const avatar = await uploadOnCloudinary(avatarLocalPath)
//     const coverImage = await uploadOnCloudinary(coverImageLocalPath)

//    //again checking if avatar is uploaded or not
//     if(!avatar){
//         throw new ApiError(400,"Avatar file is required")
//     }

//    //create object to connect to db
//    const user = await User.create({
//     fullName,
//     avatar:avatar.url,
//     coverImage:coverImage?.url || "",
//     email,
//     password,
//     username:username.toLowerCase()
//    })  
   
//    //mongodb add _id to all the entries
//    //so we use that to remove the 'password' and 'refreshToken'
//    const createdUser = await User.findById(user._id).select("-password -refreshToken")

//    if(!createdUser){
//     throw new ApiError(500,"Something went wrong while registering the user")
//    }

//    //return res
//    return res.status(201).json(
//     new ApiResponse(200,createdUser,"user registered Successfully")
//    )

//    const loginUser = asyncHandler(async(req,res)=>{
//         //to do
//         //req.body-> get data
//         //username or email pr login krwana h
//         //find the user
//         //password check
//         //generate access & refresh token
//         //send through cookie
//         //send res
//    })

// })

// export {
//     registerUser,
//     // loginUser
// }