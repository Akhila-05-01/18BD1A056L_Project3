const express=require('express')
const app=express()
const bodyParser=require('body-parser')
const MongoClient=require('mongodb').MongoClient;
const e = require('express');
const { compile } = require('ejs');

var db;
var s;

MongoClient.connect('mongodb://localhost:27017/admin',(err,database)=>{
    if(err)
        return console.log(err)
	db=database.db('admin')
    app.listen(5000,()=>{
        console.log('Listening on port number 5000')
    })
})

app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json())
app.use(express.static('public'))
//load home page
app.get('/create',(req,res)=>{
    res.render('add.ejs')
})
//get home page
app.get('/',(req,res)=>{
    db.collection('fruits').find().toArray((err,result)=>{
        if(err)
            return console.log(err)
        res.render('homepage.ejs',{data: result})//data:result=data frm db is sent to homepage.ejs
    })
})
/*app.get('/', (req,res)=>{
	db.collection('fruits').find().toArray((err,result)=>{
	  if(err) return console.log(err)
	res.render('add.ejs',{data: result}) //result is sent as data to homepage
	// all the records as objects and objects as array is sent to homepage
	})
  })*/
//to add new fruit
app.post('/add', (req,res)=>{
    db.collection('fruits').save(req.body,(err,result)=>{
      if(err) return console.log(err)
      res.redirect('/')
    })
})
//to update quantity or price of a fruit
app.get('/update',(req,res)=>{
    var fr_id=req.query.fr_id;
	db.collection('fruits').find().toArray((err,result)=>{
		if(err) return console.log(err);
		res.render('update.ejs',{data:{fr_id:fr_id,fruits:result}});
	})

})

app.get('/delete',(req,res)=>{
    res.render('delete.ejs')
})

app.post('/delete', (req,res)=>{
    db.collection('fruits').findOneAndDelete({fr_id: req.body.fr_id}, (err,result)=>{
      if(err) return console.log(err)
      res.redirect('/')
    })
})
app.get('/salesdetails',(req,res)=>{
	db.collection('fruitSales').find().toArray((err,result)=>{
		if(err) return console.log("err");
		res.render('sales_details.ejs',{data:result});
	})
})
app.post('/updatedetails',(req,res)=>{
	var oldQuantity;
	var DATE=new Date();
	let day = ("0" + DATE.getDate()).slice(-2);
	let month = ("0" + (DATE.getMonth() + 1)).slice(-2);
	let year = DATE.getFullYear();
	var date=day.toString()+"-"+month.toString()+"-"+year.toString();
	var price;
	var quantity;
	var t_price;
	var change;
	var set=0;
	var id={fr_id:req.body.fr_id};
	var newValue;
	db.collection('fruits').find().toArray((err,result)=>{
		for(var i=0;i<result.length;i++){
			if(result[i].fr_id==req.body.fr_id){
				oldQuantity=result[i].Quantity;
				if(parseInt(req.body.Quantity)+parseInt(oldQuantity)<parseInt(oldQuantity)){
					price=result[i].selling_price;
					quantity=parseInt(req.body.Quantity)*-1;
					t_price=(parseInt(req.body.Quantity))*parseInt(req.body.selling_price)*-1;
				}
				break;
			}
		}
		if(parseInt(req.body.Quantity)+parseInt(oldQuantity)<0){
			set=1;
			change=(parseInt(req.body.Quantity)+parseInt(oldQuantity))*-1;
			newValue={ $set :{Quantity:0,selling_price:req.body.selling_price}};
			quantity=quantity-change;
		}
		else{newValue={ $set :{Quantity:parseInt(req.body.Quantity)+parseInt(oldQuantity),selling_price:req.body.selling_price}};}
		db.collection('fruits').updateOne(id,newValue,(err,result)=>{
			if(err) return console.log(err);
			if(parseInt(req.body.Quantity)+parseInt(oldQuantity)<parseInt(oldQuantity)){
				db.collection('fruitSales').find({fr_id:req.body.fr_id}).toArray((err,da)=>{
					var flag=0;
					for(var k=0;k<da.length;k++){
					if(da[k].Purchase_Date==date){
						flag=1;
						console.log("inside");
						var total=(da[k].Total_Sales+t_price);
						var quan=da[k].Quantity+quantity;
						var updatequery={ $set :{Quantity:quan,Total_Sales:total}};
						var _id={_id:da[k]._id};
						db.collection('fruitSales').updateOne(_id,updatequery,(err, bookresult)=>{
							if(err) return console.log("err");
						})
					}}
					if(flag==0){
						console.log("today");
						var q={Purchase_Date:date,fr_id:req.body.fr_id,selling_price:price,Quantity:(quantity),Total_Sales:t_price}
						db.collection('fruitSales').insertOne(q,(err,resultsale)=>{
							if(err) return console.log(err);
						})
					}
				})
			}
			res.redirect('/');
		})
	})
})

app.post('/update_sales',(req,res)=>{
	db.collection('fruitSales').find({fr_id:req.body.fr_id,Purchase_Date:req.body.Purchase_Date}).toArray((err,result)=>{
		if(err) return console.log(err);
		if(result.length==0){
			console.log("couldn't find ID")
			res.redirect('/salesdetails')
			return "abc"
		}
		console.log(result[0].Total_Sales)
		var t_price=parseInt(result[0].Total_Sales)-(parseInt(req.body.Quantity)+parseInt(result[0].selling_price)-1);
		var quantity=parseInt(result[0].Quantity)+parseInt(req.body.Quantity);
		var query1={ $set :{Quantity:quantity,Total_Sales:t_price}}
		var query={ _id :result[0]._id}
		var id=req.body.fr_id;
		var qq=parseInt(req.body.Quantity)*-1;
		if(quantity<=0){
			if(quantity<0){
				qq=result[0].Quantity;
			}
			db.collection('fruitSales').deleteOne(query,(err,resultdel)=>{
				if(err) return console.log(err);
			})
		}
		else{
		db.collection('fruitSales').updateOne(query,query1,(err,results)=>{
			if(err) return console.log(err);
		})}
		db.collection('fruits').find({fr_id:req.body.fr_id}).toArray((err,resultsss)=>{
			if(err) return console.log(err);
			console.log(resultsss)
			var q=(qq)+resultsss[0].Quantity;
			var qr={ $set :{Quantity:q}}
			db.collection("fruits").updateOne({fr_id:req.body.fr_id},qr,(err,resultss)=>{
				if(err) return console.log(err);
			})
		})
		res.redirect('/salesdetails')
		
	})
})
app.post('/update_sales',(req,res)=>{
	db.collection('fruitSales').find({
		fr_id: req.body.fr_id,Purchase_Date: req.body.Purchase_Date
	}).toArray((err,result)=>{
		if(err)return console.log("error")
		var q=parseInt(result[0].Quantity)+parseInt(req.body.Quantity)
		var p=parseInt(result[0].Total_Sales)-parseInt(req.body.Quantity)*-1*parseInt(result[0].selling_price)
		var query={$set:{Quantity:q,Total_Sales:p}}
		var que={_id:result[0]._id}
		db.collection('fruitSales').updateOne(que,query,(err,result)=>{
			if(err) return console.log("err");
			res.redirect('/salesdetails')
		})
	})

})
app.get('/updatesales',(req,res)=>{
	res.render('update_sales.ejs');
})

