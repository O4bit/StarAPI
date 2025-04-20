const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    
    const statusCode = err.statusCode || 500;
    
    const errorResponse = {
        error: err.message || 'Internal Server Error',
        status: statusCode
    };
    
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
    }
    
    res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;