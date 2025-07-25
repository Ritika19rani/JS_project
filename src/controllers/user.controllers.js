import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import { subscribe } from "diagnostics_channel";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken =  user.generateAccessToken()
        const refreshToken = user.generateReferenceToken()
        
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"something went wrong while generating access & refresh tokens")
    }
}

const registerUser=asyncHandler(async(req,res)=>{

    //get user details from frontened
    //all are filled or not
    //check if user already exist or not->username/email
    //check for img/avatar
    //upload them to cloudinary,avatar(frontened->through multer->my system->cloudinary)
    //create user ob->create entry in db
    //remove password & refresh token from res
    //return res

    //get user details from frontened
    const {username,fullName,email,password} =req.body
    // console.log("email",email);
     
    //can write this but using more optimized code because using this below code we have to write it for all(fullName,username,email....etc)
    //  and that will make our code boring and lengthy

    // if(fullName===""){
    //     throw new ApiError(400,"Full Name is required")
    // }

    //optimized one(all are filled or not)
    //.some()->It checks if at least one item in the array meets a condition,returns true or false.
    //?->it is optional chaining
    //.trim() removes extra spaces from the start and end of a string.

    if (
        [fullName,email,username,password].some((field)=>field?.trim() === "")
    ) {
        throw new ApiError(400,"All fields are required")
    }

    //check if user already or not either using username or email
    const existedUser = await User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"username or email already exists")
    }
    // console.log(req.files) // <- to do

    //check for img/avatar
    //req.files->Refers to the uploaded files in the request
    //.path->Gets the file path on the server where the file was stored.
    const avatarLocalPath = req.files?.avatar[0]?.path;

    //not using below code for coverImage bcz for avatar we are checking that and throws error if file is not uploaded
    //but we are not doing that for coverImage so using diff code
    // const coverImageLocalPath=req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    //upload to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   //again checking if avatar is uploaded or not
    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

   //create object to connect to db
   const user = await User.create({
    fullName,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
   })  
   
   //mongodb add _id to all the entries
   //so we use that to remove the 'password' and 'refreshToken'
   //.select->method to remove which is written (password || refersh token) inside it
   const createdUser = await User.findById(user._id).select("-password -refreshToken")

   if(!createdUser){
    throw new ApiError(500,"Something went wrong while registering the user")
   }

   return res
   .status(201)
   .json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})

const loginUser =asyncHandler(async(req,res)=>{

    //to do
        //req.body-> get data
        //username or email pr login krwana h
        //find the user
        //password check
        //generate access & refresh token
        //send through cookie
        //send res


    //get data from req.body
    const {email,username,password} =req.body
    
    if(!username && !email){
        throw new ApiError(400,"username or email is required")
    }

    //with the help of this code we can login either using username or email syntax->"$or"
    const user = await User.findOne({
        $or:[{username},{email}]
    })
    
    //find the user
    if(!user){
        throw new ApiError(404,"User doesn't exist")
    }

    //password check
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid Password")
    }

    //generate access & refresh token->as we are going to use this multiple times so we will define a method and call by it whenever needed
    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

    
    //we are trying to put _id value in user so that we can use that
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //send through cookie
   const options = {
    httpOnly: true,  //with the help of this we can modify our cookie using http but only server can do it
    secure: true
   }

   return res
   .status(200)
   .cookie("accessToken",accessToken)
   .cookie("refreshToken",refreshToken,options)
   .json(         //send res
    new ApiResponse(200,{user:loggedInUser,accessToken,refreshToken},"User logged in Successfully")
   )

})

const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken:1 //this removes the field from document
            }
        },
        {
            new: true
        }
)

   const options={
    httpOnly:true,
    secure:true
   }

   return res
   .status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(new ApiResponse(200,{},"User logged out"))

})

//we have to refresh or regenerate the access token so that we can login without gmail/username
const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
       const user = await User.findById(decodedToken?._id)
       if(!user){
        throw new ApiError(401,"Inalid refresh token")
       }
    
       if(incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(401,"Refresh Token is expired or used")
       }
    
       const options={
        httpOnly:true,
        secure:true
       }
    
       const {accessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
       return res
       .status(200)
       .cookie("accessToken",accessToken,options)
       .cookie("refreshToken",newRefreshToken,options)
       .json(
        new ApiResponse(200,{accessToken,refreshToken:newRefreshToken},"Access token refreshed")
       )
    
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler( async (req,res) => {
        const {oldPassword,newPassword} = req.body

        const user = await User.findById(req.user?._id)
        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

        if(!isPasswordCorrect){
            throw new ApiError(400,"Invalid password")
        }

        user.password = newPassword
        await user.save({validateBeforeSave:false})

        return res
        .status(200)
        .json(
            new ApiResponse(200,{},"Password changed successfully")
        )

})

const getCurrentUser = asyncHandler(async(req,res)=>{
       return res
       .status(200)
       .json(
           new ApiResponse(200,req.user,"current user fetched successfully")
       )
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
       const {fullName,email,} = req.body

       if(!fullName || !email){
        throw new ApiError(400,"All fields are required")
       }
       
       const user = await User.findByIdAndUpdate(req.user?._id,{
          $set:{
            fullName,
            email:email
          }
       },{new:true}).select("-password")

       return res
       .status(200)
       .json(
          new ApiResponse(200,user,"account details updated successfully")
       )
})

const updateUserAvatar = asyncHandler(async(req,res)=>{

    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {
            new:true
        }.select("-password")
    )

     return res
    .status(200)
    .json(
        new ApiError(200,user,"avatar updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{

    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"coverimage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"error while uploading on coverimage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {
            new:true
        }.select("-password")
    )

    return res
    .status(200)
    .json(
        new ApiError(200,user,"cover image updated successfully")
    )
})

const getUserChannelProfile = asyncHandler( async (req,res) => {
       const {username} = req.params

       if(!username?.trim){
          throw new ApiError(40,"username is missing")
       }

      const channel =  await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscriberedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                }
            },
            channelSubscribedToCount:{
                $size:"$subscribedTo"
            },
            
                isSubscribed:{
                    $second:{
                        if:{$in:[req.user?._id,"$subscribers.subscribers"]},
                        then:true,
                        else:false
                    }
                }
            
        },
       
        {
            $project:{
                fullName:1,
                username:1,
                subscribersCount:1,
                isSubscribed:1,
                channelSubscribedToCount:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404,"channel doesn't exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"user channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req,res)=>{
       const user = await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },{
            $lookup:{
                from:"Videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                       $addFields:{
                         owner:{
                            $first:"$owner"
                         }
                       }
                    }
                ]
            }
        }
       ])

       return res
       .status(200)
       .json(
            new ApiResponse(200,user[0].WatchHistory,"watch history fetched successfully")
       )
})
   
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}