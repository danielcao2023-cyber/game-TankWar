# 🪖 坦克大战 3D

基于 **Three.js** 的浏览器端 3D 坦克大战游戏，无需安装，打开即玩。

![游戏截图](https://raw.githubusercontent.com/danielcao2023-cyber/game-TankWar/main/preview.png)

## 游戏玩法

| 操作 | 说明 |
|------|------|
| `W A S D` | 移动坦克 |
| 鼠标移动 | 旋转炮塔瞄准 |
| 鼠标左键 | 发射炮弹 |
| `ESC` | 暂停 / 继续 |

### 目标
消灭地图上所有敌人，进入下一波。每波敌人数量递增，难度提升。

### 道具
击毁敌人有概率掉落道具（35%）：

| 道具 | 效果 |
|------|------|
| ❤️ 回血 | 恢复 2 点生命值 |
| ⚡ 加速 | 移动速度提升 75%，持续 6 秒 |
| 🔥 穿甲弹 | 炮弹可穿透砖墙，持续 8 秒 |
| 💛 补充弹药 | 恢复 12 发弹药 |

### 地图元素
- **红色砖墙** — 可被炮弹摧毁
- **灰色钢墙** — 不可破坏

## 快速开始

需要本地 HTTP 服务器（ES Modules 不支持 `file://` 协议）：

```bash
# 克隆项目
git clone https://github.com/danielcao2023-cyber/game-TankWar.git
cd game-TankWar

# 启动服务器（任选其一）
npx serve . -p 3000
# 或
python3 -m http.server 3000
```

然后在浏览器访问 `http://localhost:3000`。

> Three.js 通过 CDN 自动加载，无需 `npm install`。

## 技术栈

- **Three.js r165** — 3D 渲染（CDN importmap）
- **Web Audio API** — 音效合成（开炮、爆炸、击中、波次通关）
- **原生 ES Modules** — 无构建工具，零依赖

## 项目结构

```
index.html          # 页面结构 + 所有 UI 界面
src/
  main.js           # 游戏主循环、状态机
  scene.js          # Three.js 场景、摄像机、灯光
  map.js            # 地图生成、碰撞检测
  tank.js           # 坦克基类（模型、血条、受伤效果）
  player.js         # 玩家控制（移动、瞄准、射击）
  enemy.js          # 敌人 AI（巡逻 / 追击 / 攻击）
  bullet.js         # 炮弹（飞行、拖尾、光效）
  explosion.js      # 爆炸粒子系统
  powerup.js        # 道具（旋转动画、拾取判定）
  hud.js            # HUD 界面（血条、小地图等）
  audio.js          # Web Audio 音效合成
  input.js          # 键盘 + 鼠标输入
```
