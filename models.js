const mongoose = require('mongoose')

mongoose.connect('mongodb://localhost:27017/game-data', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
})


const UserSchema =  new mongoose.Schema({
  username: {type: String, unique: true},
  password: {
    type: String, 
    set(val) {
      return require('bcryptjs').hashSync(val, 10)
    }
  }
})
const User = mongoose.model('User', UserSchema)


const ProfileSchema =  new mongoose.Schema({
  imageUrl: { type: String },
  name: {type: String },
  bname: {type: String},
  nav: { type: Array },
  description: { type: String },
  footer: { type: String },
  created_at: { type: String, unique: true },
})
const Profile = mongoose.model('Profile', ProfileSchema)


const ArticleSchema = new mongoose.Schema({
  title: { type: String },
  description: {type: String},
  img: { type: String },
  body: { type: String },
  created_at: { type: String },
  view: { type: Number },
  zan: { type: Array },
  url: { type: String , unique: true }
})

const Article = mongoose.model('Article', ArticleSchema)


//总留言
const Message = mongoose.model('Message', new mongoose.Schema({
	username: { type: String },
	message: { type: String },
	email: { type: String },
	url: { type: String },
	ip: { type: String },
	city: { type: String},
	created_at: { type: String },
  show: { type: Boolean },
  avatar: { type: String }
}))

//评论
const Reply = mongoose.model('Reply', new mongoose.Schema({
  os_info: { type: String },
  browser_info : { type: String },
  city: { type: String },
  content: { type: String },
  ip: { type: String },
  name: { type: String},
  created_at: { type: String },
  avatar: { type: String },
  site: { type: String },
  email: { type: String },
  article_id : { type: String, unique: false }
}))

const Weibo = mongoose.model('Weibo', new mongoose.Schema({
  oid: { type: String },
  mobile : { type: String }
}))

const Gameinfo = mongoose.model('Gameinfo', new mongoose.Schema({
  wallet_address: {type: String, required: true},
  invite_id: { type: String, immutable: true }, // 邀请人ID
  invited_people: { type: Array, default: [] },
  telegram_id : { type: String, unique: true, required: true}, // 电报ID
  game_count: { type: Number, default: 1, min:0, max:5 }, // 游戏次数
  score: { type: Number, default: 0 }, //分数
  ip: { type: String },
  game_history: [{
    score: { type:String },
    created_at: { type: String }
  }],
  created_at: { type: String },
  give: { type: Boolean, default: false }, // 是否发放奖励
}))

// 清空user表
// User.db.dropCollection('users')
// Gameinfo.db.dropCollection('gameinfos')
module.exports = { User, Profile, Article, Message, Reply, Weibo, Gameinfo }