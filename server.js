const { User, Profile, Article, Message, Reply, Weibo, Gameinfo } = require('./models')
const express = require('express');
const app = express();
app.use(require('cors')())
const port = process.env.PORT || 3010;
const fs = require('fs')
//jwt加密字符串
const SECRET = 'obz'
const jwt = require('jsonwebtoken')
// const www = process.env.WWW || './';
// app.use(express.static(www));
// console.log(`serving ${www}`);
app.use(express.json())
app.use('/uploads', express.static(__dirname + '/uploads'))

app.post(`/server_pull`, function(req, res) {
  const gitee_key = req.headers['x-gitee-token']
  if (gitee_key !== '686868') {
    return false
  }
  // 子进程
  var exec = require("child_process").exec;
  //需要执行的命令字符串
  var cli = "sh ./pull.sh";
  // 执行命令
  exec(cli, { encoding: "utf8" }, function(err, stdout, stderr) {
      // 如果抛出错误
      if (err) {
          console.log(`err`, err);
          // 返回结果
          res.send({
              code: -1,
              data: `一些错误`,
              msg: err
          });
          return;
      }
      // 如果没有错误,则执行命令成功
      console.log("stdout >>>>>>>>>>>>> " + stdout);
      console.log("stderr >>>>>>>>>>>>> " + stderr);
      // 返回结果
      res.send({
          code: 0,
          data: `更新成功`,
          msg: `
          ${stdout}
          >>>>>
          ${stderr}
          `
      });
  });
});

app.post(`/web_pull`, function(req, res) {
  const gitee_key = req.headers['x-gitee-token']
  if (gitee_key !== '686868') {
    return false
  }
  // 子进程
  var exec = require("child_process").exec;
  //需要执行的命令字符串
  var cli = "sh ../blog-web/pull_web.sh";
  // 执行命令
  exec(cli, { encoding: "utf8" }, function(err, stdout, stderr) {
      // 如果抛出错误
      if (err) {
          console.log(`err`, err);
          // 返回结果
          res.send({
              code: -1,
              data: `一些错误`,
              msg: err
          });
          return;
      }
      // 如果没有错误,则执行命令成功
      console.log("stdout >>>>>>>>>>>>> " + stdout);
      console.log("stderr >>>>>>>>>>>>> " + stderr);
      // 返回结果
      res.send({
          code: 0,
          data: `更新成功`,
          msg: `
          ${stdout}
          >>>>>
          ${stderr}
          `
      });
  });
});




// app.get('/users', async (req, res) => {
//   const users = await User.find()
//   res.send(users)
// })

const multer = require('multer')
const upload = multer({ 
  dest: __dirname + '/uploads',
  filename: function(req,file,cb){
    cb(null,file.fieldname +' - '+ Date.now())
   }
})
//上传图片
app.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With');
  res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
  if (req.method == 'POST') {
   
  // file.url = `http://localhost:3010/uploads/${file.originalname}`
    file.url = `https://api.songbaizhi.top/uploads/${file.originalname}`
    fs.rename( req.file.path, __dirname + '/uploads/' + req.file.originalname, function(err) {
      if (err) {
          throw err;
      }
    });
    res.send(file)
  }
  else {
    res.status(422).send({
      message: '请求失败'
    })
  }
})

// 注册
app.post('/register', async (req, res) => {
  try {
    const user = await User.create({
      username: req.body.username,
      password: req.body.password
    })
    res.send(user)
  } catch (error) {
    res.status(422).send({
      err: error,
      message: '注册失败'
    })
  }
})

// 登陆
app.post('/login', async (req, res) => {
  const user = await User.findOne({
    username: req.body.username
  })
  if (!user) {
    return res.status(422).send({
      message: '用户名不存在'
    })
  }

  const isPasswordValid = require('bcryptjs').compareSync(
    req.body.password,
    user.password
  )
  if (!isPasswordValid) {
    return res.status(422).send({
      message: '密码错误'
    })
  }
  // 生成token
  const token = jwt.sign({
    id: String(user._id)
  }, SECRET)
  res.send({
    user, 
    token
  })
  res.send(user)
})

//中间件
const auth = async (req, res, next) => {
  const raw = String(req.headers.authorization).split(' ').pop()
  try {
    const { id } = jwt.verify(raw, SECRET)
    req.user = await User.findById(id)
    next()
  } catch {
    return res.status(403).send({
      message: '身份验证失败'
    })
  } 
}
// user信息
app.get('/profile', auth, async (req, res) => {
  res.send(req.user)
})

//设置个人信息
app.post('/profile_set', auth, async (req, res) => {
  let time = new Date()
  const profile = await Profile.create({
    bname: req.body.bname,
    imageUrl: req.body.imageUrl,
    footer: req.body.footer,
    nav: req.body.nav,
    description: req.body.description,
    created_at: time,
    name: req.body.name,
  });
  res.send(profile)
})

//查询博客主人信息
app.get('/profile_info', async (req, res) => {
  const profile = await Profile.find().sort({'_id': -1}).limit(5)
  res.send(profile)
})

//查询文章
app.get('/article_list', async (req, res) => {
  const {pageNum, pageSize } = req.query
  Article.countDocuments((err, count) => { //查询出结果返回
		Article.find()
							.skip((Number(pageNum) - 1) * pageSize)
							.limit(Number(pageSize))
							.sort({'created_at': -1})
							.exec((err, doc) => {
								try {
									if (!err && doc) {
											return res.json({code: 0, totalCount: count, msg: doc.length > 0 ? '文章列表获取成功' : '没有更多文章了。', data: doc})
									}
									res.json({code: 1, msg: '后端出错', err: err})
								} catch (e) {
									res.json({code: 1, msg: '后端出错', err: e})
								}
							})
	})
})

//文章id查内容
app.get('/article_id', async (req, res) => {
  const article = await Article.find({
		_id: req.query.id
  })
  res.send(article)
})

//文章url查内容
app.get('/article_url', async (req, res) => {
  const article = await Article.find({
		url: req.query.url
  })
  res.send(article)
})

//文章id 查前后文章
app.get('/article_n_p', async (req, res) => {
  const article_lt = await Article.find({
		'created_at': { '$lt': req.query.id }
  }).sort({ created_at: -1}).limit(1)
  const article_gt = await Article.find({
    'created_at': { '$gt': req.query.id }
  }).sort({ created_at: 1}).limit(1)
  res.send({
    data: {
      lt: article_lt[0] || '没有更多了',
      gt: article_gt[0] || '没有更多了'
    },
    message: '获取前后记录成功'
  })
})

//浏览次数增加
app.post('/article_view_add', async (req, res) => {
  try {
    await Article.updateOne({ url: req.body.id }, { $inc: { view: 1 } })
    const num = await Article.find({ url: req.body.id }, { view: 1})
    res.send({
      message: '更新成功',
      result: num[0]
    })
  } catch (error) {
    res.status(422).send({
      message: '更新失败',
      result: false,
      err: error
    })
  }
})

// 获取点赞结果
app.get('/article_zan_get', async (req, res) => {
  try {
    // const r = await Article.find({ zan: [req.query.ip] }, { _id: req.query.id, zan:1 })
    const r = await Article.find({ url: req.query.id, "zan": req.query.ip}, { zan: 1 })
    res.send({
      message: 'success',
      result: r
    })
  } catch (error) {
    res.status(422).send({
      message: '失败',
      result: false,
      err: error
    })
  }
})

//文章发表评论
app.post('/article_reply', async (req, res) => {
  try {
    const reply = await Reply.create({
      os_info: req.body.os_info,
      browser_info : req.body.browser_info,
      city: req.body.city,
      content: req.body.content,
      ip: req.body.ip,
      name: req.body.name,
      avatar: req.body.avatar,
      created_at: req.body.created_at,
      article_id : req.body.article_id,
      email : req.body.email
    });
    res.send({
      message: '评论发表成功',
      data: reply
    })
  } catch (error) {
    res.status(422).send({
      message: '失败',
      err: error
    })
  }
})

//文章查询评论
app.get('/reply', async (req, res) => {
  const {pageNum, pageSize } = req.query
  Reply.countDocuments({'article_id': req.query.article_id }, (err, count) => { //查询出结果返回
		Reply.find({'article_id': req.query.article_id })
							.skip((Number(pageNum) - 1) * pageSize)
							.limit(Number(pageSize))
							.sort({'_id': -1})
							.exec((err, doc) => {
								try {
									if (!err && doc) {
											return res.json({code: 0, totalCount: count, msg: doc.length > 0 ? '列表获取成功' : '没有更多了。', data: doc})
									}
									res.json({code: 1, msg: '后端出错', err: err})
								} catch (e) {
									res.json({code: 1, msg: '后端出错', err: e})
								}
							})
	})
})

//删除评论
app.post('/reply_del', auth, async (req, res) => {
  await Reply.findByIdAndDelete(req.body.id)
  res.send({
    message: '删除成功!'
  })
})

//文章点赞功能
app.post('/article_zan', async (req, res) => {
  try {
    await Article.updateOne({ url: req.body.id }, { $addToSet: { zan: req.body.ip } })
    res.send({
      message: 'success'
    })
  } catch (error) {
    res.status(422).send({
      message: '失败',
      err: error
    })
  }
})

//文章取消点赞
app.post('/article_zan_del', async (req, res) => {
  try {
    await Article.updateOne({ url: req.body.id }, { $pull: { zan: req.body.ip } })
    res.send({
      message: '取消成功'
    })
  } catch (error) {
    res.status(422).send({
      message: '失败',
      err: error
    })
  }
})

//发布文章
app.post('/article_new', auth, async (req, res) => {
  try {
    const article = await Article.create({
      url: req.body.url,
      title: req.body.title,
      img: req.body.img,
      body: req.body.body,
      description: req.body.description,
      created_at: req.body.created_at,
      view: req.body.view || 0
    });
    res.send({
      row: article,
      message: '文章发布成功!'
    })
  } catch (error) {
    res.status(422).send({
      err: error,
      message: '文章链接不唯一'
    })
  }

})

//删除文章
app.post('/article_del', auth, async (req, res) => {
  await Article.findByIdAndDelete(req.body.id)
  res.send({
    message: '删除成功!'
  })
})

//修改文章
app.post('/article_exit', auth, async (req, res) => {
  try {
    const article_new = {}
    article_new.title = req.body.title,
    article_new.img = req.body.img,
    article_new.body = req.body.body,
    article_new.description = req.body.description,
    article_new.created_at = req.body.created_at
    article_new.view = req.body.view
    article_new.url = req.body.url
  
    const article = await Article.findByIdAndUpdate({ _id: req.body.id }, { $set: article_new }, { new: true})
    res.send({
      row: article,
      message: '修改成功!'
    })
  } catch (error) {
    res.status(422).send({
      err: error,
      message: '文章链接不唯一'
    })
  }

})

//删除留言
app.post('/message_del', auth, async (req, res) => {
  await Message.findByIdAndDelete(req.body.id)
  res.send({
    message: '删除成功!'
  })
})
// 展示留言
app.post('/show_message', auth, async function (req, res) {
  const message = await Message.findByIdAndUpdate({ _id: req.body.id }, { $set: { show: req.body.show } }, { new: true}) 
  if (!message) { 
    return res.status(422).send({
      message: '修改失败'
    }) 
  }
	res.send(message)
})

// 总留言列表
app.get('/message_list', auth, async function (req, res) {
	const {pageNum, pageSize } = req.query
	Message.countDocuments((err, count) => { //查询出结果返回
		Message.find()
							.skip((Number(pageNum) - 1) * pageSize)
							.limit(Number(pageSize))
							.sort({'_id': -1})
							.exec((err, doc) => {
								try {
									if (!err && doc) {
											return res.json({code: 0, totalCount: count, msg: doc.length > 0 ? '留言列表获取成功' : '没有留言。', data: doc})
									}
									res.json({code: 1, msg: '后端出错'})
								} catch (e) {
									res.json({code: 1, msg: '后端出错'})
								}
							})
	})
})

// 提交留言
app.post('/add_message', async function (req, res) {
	let time = new Date()
	const m = await Message.create({
		username: req.body.username || '匿名',
    created_at: time,
		email: req.body.email || '-',
		url: req.body.url || '-',
		message: req.body.message,
		city: req.body.city,
		ip:req.body.ip,
    show: false,
    avatar: req.body.avatar
	})
	res.send({
    message: '留言提交成功!',
    data: m
	})
})

// 无需权限验证
// 已经通过审核的留言
app.get('/message_verify_list', async function (req, res) {  
	const {pageNum, pageSize } = req.query
	Message.countDocuments({'show': true },(err, count) => { //查询出结果返回
		Message.find({"show": true})
							.skip((Number(pageNum) - 1) * pageSize)
							.limit(Number(pageSize))
							.sort({'_id': -1})
							.exec((err, doc) => {
								try {
									if (!err && doc) {
											return res.json({code: 0, totalCount: count, msg: doc.length > 0 ? '留言列表获取成功' : '没有留言。', data: doc})
									}
									res.json({code: 1, msg: '后端出错', err: err})
								} catch (e) {
									res.json({code: 1, msg: '后端出错', err: e})
								}
							})
	})
})
//文章url查内容
app.get('/weibo', async (req, res) => {
  if (req.query.oid) {
    console.log('oid');
    const weibo = await Weibo.findOne({
      oid: req.query.oid
    })
    return res.send(weibo)
  }
  if (req.query.mobile) {
    console.log('mobile');
    const weibo = await Weibo.findOne({
      mobile: req.query.mobile
    })
    return res.send(weibo)
  }
})

app.get('/game_list', async (req, res) => {
  const {pageNum, pageSize, give, keyword } = req.query
  const filters = {}
  if (give !== undefined) {
    filters.give = give
  }
  if (keyword !== undefined) {
    filters.$or = [  // 多字段同时匹配
      {telegram_id: {$regex: keyword, $options: '$i'}}, //  $options: '$i' 忽略大小写
    ]
  }
 
  Gameinfo.find(filters).countDocuments((err, count) => { //查询出结果返回
		Gameinfo.find(filters).skip((Number(pageNum) - 1) * pageSize)
							.limit(Number(pageSize))
							.sort({'created_at': -1})
							.exec((err, doc, ) => {
								try {
									if (!err && doc) {
											return res.json({code: 0, totalCount: count, msg: doc.length > 0 ? '文章列表获取成功' : '没有数据。', data: doc})
									}
									res.json({code: 1, msg: '后端出错', err: err})
								} catch (e) {
									res.json({code: 1, msg: '后端出错', err: e})
								}
							})
	})
})
// 发放奖励
app.post('/game_give', async function (req, res) {
  const gameinfo = await Gameinfo.findByIdAndUpdate({ _id: req.body.id }, { $set: { give: req.body.give } }, { new: true}) 
  if (!gameinfo) { 
    return res.status(422).send({
      message: '修改失败'
    }) 
  }
	res.send({
    code: 0,
    data: gameinfo
  })
})

app.post('/game_submit', async (req, res) => {
  let time = new Date()
  const gameinfo = await Gameinfo.findOne({
    telegram_id: req.body.telegram_id
  })
  if (gameinfo) {
    return res.send({
      data: gameinfo
    })
  } else {
    try {
      const gameinfo = await Gameinfo.create({
        wallet_address: req.body.wallet_address,
        invite_id: req.body.invite_id,
        telegram_id: req.body.telegram_id,
        ip: req.body.ip,
        created_at: time
      });
      res.send({
        code: 0,
        data: gameinfo,
        message: '提交成功'
      })
    } catch (error) {
      res.status(422).send({
        err: error,
        message: 'telegram ID 重复'
      })
    }
  }
})

//删除评论
app.post('/game_del', async (req, res) => {
  await Gameinfo.findByIdAndDelete(req.body.id)
  res.send({
    message: '删除成功!'
  })
})


app.post('/game_over', async (req, res) => {
  const gameinfo_one = await Gameinfo.findOne({
    telegram_id: req.body.telegram_id
  })


  if (req.body.invite_id) {
    // 如果有邀请人
    const invite_one = await Gameinfo.findOne({
      telegram_id: req.body.invite_id
    })
    if (invite_one) {
      if (req.body.invite_id !== req.body.telegram_id && invite_one.invited_people.indexOf(req.body.telegram_id) == -1 && invite_one.invited_people.length < 999) {
        const addCount = {}
        addCount.game_count = invite_one.game_count += 1
        addCount.invited_people = invite_one.invited_people
        addCount.invited_people.push(req.body.telegram_id)
        await Gameinfo.findOneAndUpdate({ telegram_id: req.body.invite_id }, { $set: invite_one }, { new: true})
      }
    } else {
      return res.send({
        code: 4005,
        message: '参数错误,邀请id有误'
      })
    }
  }

  const gameinfo_new = {}
  
  if (req.body.invite_id !== req.body.telegram_id) {
    gameinfo_new.game_count = gameinfo_one.game_count -= 1
    gameinfo_new.score = gameinfo_one.score += Number(req.body.score)
    gameinfo_new.invite_id = req.body.invite_id
    gameinfo_new.game_history = gameinfo_one.game_history
    gameinfo_new.game_history.push({
      created_at: new Date(),
      score: req.body.score
    })
  } else {
    gameinfo_new.game_count = gameinfo_one.game_count -= 1
    gameinfo_new.score = gameinfo_one.score += Number(req.body.score)
    gameinfo_new.game_history = gameinfo_one.game_history
    gameinfo_new.game_history.push({
      created_at: new Date(),
      score: req.body.score
    })
  }

  if (gameinfo_new.game_count < 0) {
    return res.send({
      code: 4001,
      message: '你没有游戏次数'
    })
  }
  const gameinfo = await Gameinfo.findOneAndUpdate({ telegram_id: req.body.telegram_id }, { $set: gameinfo_new }, { new: true})
  res.send({
    code: 0,
    data: gameinfo,
    message: '更新成功!'
  })
})


app.get('*', (req, res) => {
  // res.sendFile(`index.html`, { root: www });
  res.status(404).send({
    message: '接口没有找到'
  })
});
app.listen(port, () => console.log(`listening on http://localhost:${port}`));
