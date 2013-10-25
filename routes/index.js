//Index page
exports.get = function(req, res){
	
	if(req.user)
	{
		req.user.populate('friends').populate('games').populate(function (err, user)
		{
			console.log(user);
			
			res.render( 'dashboard.html', { user : user })
		});
	}
	else
	{
		res.render( 'index.html', { })
	}
   
};