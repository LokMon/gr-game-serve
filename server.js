const { Gameinfo } = require('./models')
const express = require('express');
const app = express();
app.use(require('cors')())
const port = process.env.PORT || 3010;
//jwt加密字符串
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
