const mongoose = require('mongoose')

mongoose.connect('mongodb://localhost:27017/game-data', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
})


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

// 清空表
// Gameinfo.db.dropCollection('gameinfos')
module.exports = { Gameinfo }