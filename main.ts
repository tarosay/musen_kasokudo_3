// 周波数から速度へ変換
function 速度変換 (測定周期: number) {
    v = 10000 / 測定周期
    if (v > 100) {
        v = 100
    }
    if (v <= 60) {
        v = v * 0.5
    } else if (v <= 90) {
        v = 30 + (v - 60) * 2
    }
    return v
}
// 放物線補間
function 極値時刻 (t0: number, v0: number, t1: number, v1: number, t2: number, v2: number) {
    h1 = t1 - t0
    h2 = t2 - t1
    if (h1 <= 0 || h2 <= 0) {
        return t1
    }
    s1 = (v1 - v0) / h1
    s2 = (v2 - v1) / h2
    if (s1 == s2) {
        return t1
    }
    補正 = (0 - (h2 * s1 + h1 * s2)) / (2 * (s2 - s1))
    if (補正 < 0 - h1 || 補正 > h2) {
        return t1
    }
    return t1 + 補正
}
/**
 * 山・谷の検出
 */
let 最小後Y = 0
let 周期 = 0
let 最大後Y = 0
let 最小前時刻 = 0
let 最小前Y = 0
let 最小時刻 = 0
let 最大前時刻 = 0
let 最大前Y = 0
let 最大時刻 = 0
let 方向 = 0
let 速度 = 0
let 運動ピーク = 0
let 運動量 = 0
let 強度 = 0
let 今 = 0
let 補正 = 0
let s2 = 0
let s1 = 0
let h2 = 0
let h1 = 0
let v = 0
let 名前Y = ""
// 調整用パラメータ
let 反転しきい値 = 150
let 運動しきい値 = 35
let 停止時間 = 150
let 送信間隔 = 50
let 最低周期 = 50
let 最高周期 = 350
let 最大後時刻 = -1
let 最小後時刻 = -1
// 周期と運動の判定
let 前回山時刻 = -1
let 前回谷時刻 = -1
let 最終有効反転時刻 = -1
// A/Bの識別
if (input.buttonIsPressed(Button.A)) {
    名前Y = "AY"
    basic.showString("A")
} else {
    名前Y = "BY"
    basic.showString("B")
}
let y = input.acceleration(Dimension.Y)
let 前回Y = y
let 最大Y = y
let 最小Y = y
let 前回測定時刻 = input.runningTime()
let 送信時刻 = 前回測定時刻
// 静止状態での合成加速度を基準にする
let 基準強度 = input.acceleration(Dimension.Strength)
serial.redirect(
SerialPin.USB_TX,
SerialPin.USB_RX,
BaudRate.BaudRate115200
)
basic.forever(function () {
    let 山時刻: number;
let 谷時刻: number;
今 = input.runningTime()
    y = input.acceleration(Dimension.Y)
    // 合成加速度から実際の運動を検出
    強度 = input.acceleration(Dimension.Strength)
    運動量 = Math.abs(強度 - 基準強度)
    if (運動量 > 運動ピーク) {
        運動ピーク = 運動量
    }
    // 最後の有効振動から150msで停止
    if (最終有効反転時刻 >= 0) {
        if (今 - 最終有効反転時刻 >= 停止時間) {
            速度 = 0
            方向 = 0
            前回山時刻 = -1
            前回谷時刻 = -1
            最終有効反転時刻 = -1
            運動ピーク = 0
            最大Y = y
            最小Y = y
        }
    }
    if (y != 前回Y) {
        // 振動方向の初期検出
        if (方向 == 0) {
            if (y > 最大Y) {
                最大Y = y
            }
            if (y < 最小Y) {
                最小Y = y
            }
            if (y - 最小Y >= 反転しきい値) {
                方向 = 1
                最大Y = y
                最大時刻 = 今
                最大前Y = 前回Y
                最大前時刻 = 前回測定時刻
                最大後時刻 = -1
            } else if (最大Y - y >= 反転しきい値) {
                方向 = -1
                最小Y = y
                最小時刻 = 今
                最小前Y = 前回Y
                最小前時刻 = 前回測定時刻
                最小後時刻 = -1
            }
        } else if (方向 == 1) {
            // 上昇中：山を検出
            if (y > 最大Y) {
                最大前Y = 前回Y
                最大前時刻 = 前回測定時刻
                最大Y = y
                最大時刻 = 今
                最大後時刻 = -1
            } else if (y < 最大Y && 最大後時刻 < 0) {
                最大後Y = y
                最大後時刻 = 今
            }
            if (最大Y - y >= 反転しきい値) {
                山時刻 = 最大時刻
                if (最大後時刻 > 最大時刻) {
                    山時刻 = 極値時刻(最大前時刻, 最大前Y, 最大時刻, 最大Y, 最大後時刻, 最大後Y)
                }
                // 合成加速度による有効振動判定
                if (運動ピーク >= 運動しきい値) {
                    if (前回山時刻 >= 0) {
                        周期 = 山時刻 - 前回山時刻
                        if (周期 >= 最低周期 && 周期 <= 最高周期) {
                            速度 = 速度変換(周期)
                        } else {
                            速度 = 0
                        }
                    }
                    前回山時刻 = 山時刻
                    最終有効反転時刻 = 今
                } else {
                    // 回転・傾きだけと判断した振動は無効
                    速度 = 0
                    前回山時刻 = -1
                    前回谷時刻 = -1
                }
                運動ピーク = 0
                方向 = -1
                最小Y = y
                最小時刻 = 今
                最小前Y = 前回Y
                最小前時刻 = 前回測定時刻
                最小後時刻 = -1
            }
        } else {
            // 下降中：谷を検出
            if (y < 最小Y) {
                最小前Y = 前回Y
                最小前時刻 = 前回測定時刻
                最小Y = y
                最小時刻 = 今
                最小後時刻 = -1
            } else if (y > 最小Y && 最小後時刻 < 0) {
                最小後Y = y
                最小後時刻 = 今
            }
            if (y - 最小Y >= 反転しきい値) {
                谷時刻 = 最小時刻
                if (最小後時刻 > 最小時刻) {
                    谷時刻 = 極値時刻(最小前時刻, 最小前Y, 最小時刻, 最小Y, 最小後時刻, 最小後Y)
                }
                // 合成加速度による有効振動判定
                if (運動ピーク >= 運動しきい値) {
                    if (前回谷時刻 >= 0) {
                        周期 = 谷時刻 - 前回谷時刻
                        if (周期 >= 最低周期 && 周期 <= 最高周期) {
                            速度 = 速度変換(周期)
                        } else {
                            速度 = 0
                        }
                    }
                    前回谷時刻 = 谷時刻
                    最終有効反転時刻 = 今
                } else {
                    // 回転・傾きだけと判断した振動は無効
                    速度 = 0
                    前回山時刻 = -1
                    前回谷時刻 = -1
                }
                運動ピーク = 0
                方向 = 1
                最大Y = y
                最大時刻 = 今
                最大前Y = 前回Y
                最大前時刻 = 前回測定時刻
                最大後時刻 = -1
            }
        }
        前回Y = y
        前回測定時刻 = 今
    }
    // シリアル出力
    if (今 - 送信時刻 >= 送信間隔) {
        serial.writeValue(名前Y, Math.round(速度))
        送信時刻 = 今
    }
    basic.pause(5)
})
