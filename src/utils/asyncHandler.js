const asyncHandler=(requestHandler)=>{
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res.next)).catch((error)=>next(error))
    }
}


export{asyncHandler}

//PPRO14207639158

// const asyncHandler=(fn)=>async()=>{
//     try {
//         await fn(req,res,next) 
//     } catch (error) {
//         res.status(error.code||500).json({
//             success:false,
//             message:error.message
//         })
//     }
// }

